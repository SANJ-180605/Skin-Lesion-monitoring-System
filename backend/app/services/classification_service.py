import logging
import cv2
import numpy as np
from PIL import Image
from fastapi import HTTPException, status
from app.ml.model_loader import get_loaded_classification
from app.ml.preprocessing import preprocess_for_efficientnet
from app.ml.label_mapping import THREE_CLASS_NAMES, INDEX_TO_CLASS

logger = logging.getLogger("classification_service")

def compute_dermoscopic_features(pil_image: Image.Image) -> np.ndarray:
    """
    Evaluates ABCD dermoscopic visual criteria (Asymmetry, Border, Color Variegation, Darkness)
    to generate realistic differential probabilities when the loaded deep-learning model has
    untrained placeholder weights (until the user uploads their trained Colab checkpoint).
    """
    rgb = np.array(pil_image.convert("RGB"), dtype=np.uint8)
    h, w = rgb.shape[:2]
    
    bgr = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)
    margin_x = max(5, int(w * 0.12))
    margin_y = max(5, int(h * 0.12))
    rect = (margin_x, margin_y, max(1, w - 2 * margin_x), max(1, h - 2 * margin_y))
    mask = np.zeros((h, w), np.uint8)
    try:
        cv2.grabCut(bgr, mask, rect, np.zeros((1, 65), np.float64), np.zeros((1, 65), np.float64), 3, cv2.GC_INIT_WITH_RECT)
        bin_mask = np.where((mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD), 1, 0).astype('uint8')
        num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(bin_mask)
        if num_labels > 1:
            bin_mask = (labels == (1 + np.argmax(stats[1:, cv2.CC_STAT_AREA]))).astype('uint8')
    except Exception:
        gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
        _, bin_mask = cv2.threshold(cv2.GaussianBlur(gray, (5, 5), 0), 0, 1, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)

    if np.sum(bin_mask) < 20:
        return np.array([0.05, 0.10, 0.85], dtype=np.float32)

    # 1. Border / Circularity
    contours, _ = cv2.findContours(bin_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    c = max(contours, key=cv2.contourArea)
    area = cv2.contourArea(c)
    perim = cv2.arcLength(c, True)
    circ = (4 * np.pi * area) / (perim ** 2) if perim > 0 else 0.5
    circ = float(np.clip(circ, 0.1, 1.0))

    # 2. Color Variegation & Darkness
    lesion_pixels = rgb[bin_mask == 1]
    color_std = float(np.std(lesion_pixels, axis=0).mean())
    mean_lum = float(np.mean(lesion_pixels))

    # 3. Asymmetry
    h_flip = np.fliplr(bin_mask)
    overlap = np.sum(bin_mask & h_flip)
    union = max(1, np.sum(bin_mask | h_flip))
    asym_score = float(np.clip(1.0 - (overlap / union), 0.0, 1.0))

    # Evidence scores
    # Regular, uniform, light -> Benign
    # Irregular border, dark, variegated, asymmetric -> Cancerous / Precancerous
    benign_raw = 0.6 + 0.4 * circ - 0.25 * asym_score - 0.006 * color_std + (0.1 if mean_lum > 110 else -0.1)
    cancer_raw = 0.15 + 0.35 * asym_score + 0.007 * color_std + (0.25 if mean_lum < 95 else 0.0) + 0.2 * (1.0 - circ)
    precan_raw = 0.12 + 0.18 * (1.0 - circ) + 0.004 * color_std + 0.15 * asym_score

    logits = np.array([cancer_raw, precan_raw, benign_raw], dtype=np.float32)
    exp_l = np.exp(logits * 3.5)
    probs = exp_l / np.sum(exp_l)
    return probs.astype(np.float32)

def run_three_class_classification(pil_image: Image.Image):
    """
    Executes EfficientNetB0 three-class inference.
    Uses exact preprocessing from Notebook 2:
    - 224x224 RGB
    - Range [0, 255] (no division by 255 because EfficientNet includes internal rescaling)
    - Output: 3-neuron softmax [P(Cancerous), P(Precancerous / in situ), P(Benign)]
    - Automatic ABCD clinical feature fallback when untrained placeholder weights are detected
    """
    model, metadata = get_loaded_classification()
    if model is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                metadata.get("error_message") or
                "Three-class EfficientNetB0 checkpoint is not loaded. Please ensure "
                "'best_three_class_model.keras' is placed in 'backend/saved_models/efficientnet/'."
            )
        )

    # 1. Preprocess
    input_batch = preprocess_for_efficientnet(pil_image)
    
    # 2. Inference
    raw_preds = model.predict(input_batch, verbose=0)
    scores = raw_preds[0]  # Shape: (3,)
    scores = np.asarray(scores, dtype=np.float32)
    
    # 3. Check for untrained placeholder weights (all 3 classes ~0.333)
    is_untrained = bool(np.std(scores) < 0.015)
    if is_untrained:
        logger.warning(
            f"EfficientNetB0 produced uniform probabilities ({scores}). "
            "Untrained placeholder weights detected. Using ABCD dermoscopic feature evaluation."
        )
        scores = compute_dermoscopic_features(pil_image)
    
    # 4. Class index & confidence
    predicted_idx = int(np.argmax(scores))
    predicted_class = INDEX_TO_CLASS[predicted_idx]
    confidence_score = float(scores[predicted_idx] * 100.0)
    
    # 5. Probabilities breakdown for all three classes
    probabilities = []
    for idx, class_name in enumerate(THREE_CLASS_NAMES):
        prob = float(scores[idx])
        pct = round(prob * 100.0, 2)
        probabilities.append({
            "class_name": class_name,
            "probability": round(prob, 4),
            "percentage": pct
        })
        
    return {
        "predicted_class": predicted_class,
        "confidence_score": round(confidence_score, 2),
        "probabilities": probabilities,
        "model_name": metadata["name"],
        "model_version": "1.0.0 (HAM10000 3-Class)",
        "is_calibrated": False,
        "is_untrained_checkpoint": is_untrained,
        "classification_method": (
            "Notebook 2 EfficientNetB0 (Trained Weights)" 
            if not is_untrained else 
            "Dermoscopic ABCD Feature Evaluation"
        ),
        "interpretation_note": (
            "Softmax confidence score reflects model output distribution, "
            "not a confirmed biological diagnosis. Clinical review required."
        )
    }

