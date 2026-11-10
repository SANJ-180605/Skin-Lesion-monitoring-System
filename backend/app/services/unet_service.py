import logging
import numpy as np
from PIL import Image
import cv2
from fastapi import HTTPException, status
from app.ml.model_loader import get_loaded_unet
from app.ml.preprocessing import preprocess_for_unet
from app.services.image_service import save_image_array, create_segmentation_overlay

logger = logging.getLogger("unet_service")

def extract_mask_grabcut(orig_rgb: np.ndarray) -> np.ndarray:
    """
    Notebook 3 Classical CV GrabCut segmentation fallback.
    Used when U-Net weights are untrained or produce degenerate (>80% or <0.1%) coverage.
    """
    orig_h, orig_w = orig_rgb.shape[:2]
    bgr = cv2.cvtColor(orig_rgb, cv2.COLOR_RGB2BGR)
    margin_x = max(10, int(orig_w * 0.10))
    margin_y = max(10, int(orig_h * 0.10))
    rect = (margin_x, margin_y, max(1, orig_w - 2 * margin_x), max(1, orig_h - 2 * margin_y))

    mask = np.zeros((orig_h, orig_w), np.uint8)
    bgd_model = np.zeros((1, 65), np.float64)
    fgd_model = np.zeros((1, 65), np.float64)

    try:
        cv2.grabCut(bgr, mask, rect, bgd_model, fgd_model, 5, cv2.GC_INIT_WITH_RECT)
        bin_mask = np.where((mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD), 1, 0).astype('uint8')
        num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(bin_mask)
        if num_labels > 1:
            largest_label = 1 + np.argmax(stats[1:, cv2.CC_STAT_AREA])
            bin_mask = (labels == largest_label).astype('uint8')
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
        bin_mask = cv2.morphologyEx(bin_mask, cv2.MORPH_CLOSE, kernel)
    except Exception as e:
        logger.warning(f"GrabCut fallback failed ({e}), using Otsu thresholding.")
        gray = cv2.cvtColor(orig_rgb, cv2.COLOR_RGB2GRAY)
        blurred = cv2.GaussianBlur(gray, (7, 7), 0)
        _, bin_mask = cv2.threshold(blurred, 0, 1, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    
    return bin_mask

def run_unet_segmentation(pil_image: Image.Image, original_filename: str):
    """
    Executes U-Net inference on the dermoscopic image.
    Uses exact preprocessing from Notebook 1:
    - 256x256 RGB
    - Normalized to [0, 1]
    - Thresholded at 0.5 for lesion boundary
    - Fallback to Notebook 3 GrabCut if untrained model weights produce degenerate coverage
    """
    model, metadata = get_loaded_unet()
    if model is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                metadata.get("error_message") or
                "U-Net model checkpoint is not loaded. Please ensure 'model1_selected_best.keras' "
                "or 'baseline_bce_dice_best.keras' is placed in 'backend/saved_models/unet/'."
            )
        )

    # 1. Preprocess
    orig_rgb = np.array(pil_image.convert("RGB"), dtype=np.uint8)
    orig_h, orig_w = orig_rgb.shape[:2]
    
    input_batch = preprocess_for_unet(pil_image)
    
    # 2. Inference
    pred = model.predict(input_batch, verbose=0)
    prob_map = pred[0, ..., 0]  # Shape: (256, 256)
    
    # Check dynamic range of U-Net probabilities
    dyn_range = float(prob_map.max() - prob_map.min())
    mask_256 = (prob_map >= 0.5).astype(np.uint8)
    initial_coverage = float(np.mean(mask_256))
    
    # 3. Degenerate detection / GrabCut fallback
    is_fallback = False
    if dyn_range < 0.15 or initial_coverage > 0.80 or initial_coverage < 0.002:
        logger.warning(
            f"U-Net produced degenerate output (range={dyn_range:.3f}, coverage={initial_coverage:.2%}). "
            "Untrained checkpoint detected. Falling back to Notebook 3 GrabCut segmentation."
        )
        full_mask = extract_mask_grabcut(orig_rgb)
        is_fallback = True
    else:
        # Resize mask back to original image size for accurate overlay
        full_mask = cv2.resize(mask_256, (orig_w, orig_h), interpolation=cv2.INTER_NEAREST)
    
    # 4. Calculate segmentation statistics
    area_px = int(np.sum(full_mask > 0))
    total_px = orig_h * orig_w
    coverage_pct = round((area_px / total_px) * 100, 2) if total_px > 0 else 0.0
    
    contours, _ = cv2.findContours(full_mask * 255, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    perimeter_px = 0.0
    circularity = None
    if contours and area_px > 0:
        c = max(contours, key=cv2.contourArea)
        perimeter_px = float(cv2.arcLength(c, True))
        if perimeter_px > 0:
            circularity = round(float(4 * np.pi * area_px / (perimeter_px ** 2)), 4)
            
    # 5. Save visual outputs
    # Binary mask visualization (white foreground 255)
    mask_vis = (full_mask * 255).astype(np.uint8)
    mask_filename = save_image_array(mask_vis, prefix="unet_mask")
    
    # Overlay visualization
    overlay_rgb = create_segmentation_overlay(orig_rgb, full_mask, alpha=0.42)
    overlay_filename = save_image_array(overlay_rgb, prefix="unet_overlay")
    
    metrics = {
        "area_px": area_px,
        "total_pixels": total_px,
        "coverage_percentage": coverage_pct,
        "perimeter_px": round(perimeter_px, 2),
        "circularity": circularity,
        "threshold": 0.5,
        "is_fallback": is_fallback,
        "segmentation_method": "Notebook 3 GrabCut Baseline" if is_fallback else "Trained Standard U-Net"
    }
    
    return {
        "mask_filename": mask_filename,
        "overlay_filename": overlay_filename,
        "metrics": metrics
    }

