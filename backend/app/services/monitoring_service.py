import numpy as np
from PIL import Image
import cv2
from typing import Dict, Any, Tuple
from app.ml.preprocessing import preprocess_for_monitoring
from app.services.image_service import save_image_array, create_difference_map

def align_to_reference(reference_rgb: np.ndarray, moving_rgb: np.ndarray) -> Tuple[np.ndarray, str, int, str]:
    """
    Exact registration logic from Notebook 3:
    Aligns moving_rgb to reference_rgb using ORB feature matching and RANSAC homography.
    Returns (aligned_image, method_name, inliers_count, status_str)
    """
    ref_gray = cv2.cvtColor(reference_rgb, cv2.COLOR_RGB2GRAY)
    mov_gray = cv2.cvtColor(moving_rgb, cv2.COLOR_RGB2GRAY)
    
    orb = cv2.ORB_create(nfeatures=1500)
    k1, d1 = orb.detectAndCompute(ref_gray, None)
    k2, d2 = orb.detectAndCompute(mov_gray, None)
    
    if d1 is not None and d2 is not None and len(k1) >= 8 and len(k2) >= 8:
        matcher = cv2.BFMatcher(cv2.NORM_HAMMING)
        pairs = matcher.knnMatch(d2, d1, k=2)
        good = [m for m, n in pairs if len(pairs) > 0 and m.distance < 0.75 * n.distance]
        
        if len(good) >= 8:
            src = np.float32([k2[m.queryIdx].pt for m in good]).reshape(-1, 1, 2)
            dst = np.float32([k1[m.trainIdx].pt for m in good]).reshape(-1, 1, 2)
            H, inliers = cv2.findHomography(src, dst, cv2.RANSAC, 5.0)
            
            if H is not None and inliers is not None and int(inliers.sum()) >= 8:
                h, w = reference_rgb.shape[:2]
                aligned = cv2.warpPerspective(moving_rgb, H, (w, h), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
                return aligned, "ORB+RANSAC homography", int(inliers.sum()), "confirmed"
                
    # Fallback resize only
    resized = cv2.resize(moving_rgb, (reference_rgb.shape[1], reference_rgb.shape[0]), interpolation=cv2.INTER_LINEAR)
    return resized, "fallback resize only; registration not confirmed", 0, "unconfirmed_fallback"

def estimate_mask(rgb: np.ndarray) -> Tuple[np.ndarray, str]:
    """
    Exact segmentation logic from Notebook 3:
    GrabCut with center seed + connected-component filtering and morphological closing.
    Falls back to Otsu thresholding on LAB L-channel if GrabCut fails.
    """
    bgr = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)
    h, w = rgb.shape[:2]
    rect = (int(w * 0.12), int(h * 0.12), max(1, int(w * 0.76)), max(1, int(h * 0.76)))
    mask = np.zeros((h, w), np.uint8)
    bgd = np.zeros((1, 65), np.float64)
    fgd = np.zeros((1, 65), np.float64)
    
    try:
        cv2.grabCut(bgr, mask, rect, bgd, fgd, 3, cv2.GC_INIT_WITH_RECT)
        out = np.where((mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD), 255, 0).astype(np.uint8)
        n, labels, stats, _ = cv2.connectedComponentsWithStats(out, 8)
        if n > 1:
            idx = 1 + np.argmax(stats[1:, cv2.CC_STAT_AREA])
            out = np.where(labels == idx, 255, 0).astype(np.uint8)
        closed = cv2.morphologyEx(out, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
        return closed, "GrabCut baseline"
    except Exception:
        lab = cv2.cvtColor(rgb, cv2.COLOR_RGB2LAB)
        _, out = cv2.threshold(lab[:, :, 0], 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
        return out, "Otsu fallback"

def measure_mask(mask: np.ndarray) -> Dict[str, Any]:
    """
    Exact measurement extraction from Notebook 3:
    - area_px: pixel count
    - perimeter_px: contour arc length
    - bbox_w_px: bounding box width
    - bbox_h_px: bounding box height
    - circularity: 4 * pi * area / (perimeter^2)
    """
    binary = (mask > 0).astype(np.uint8)
    area = int(binary.sum())
    contours, _ = cv2.findContours(binary * 255, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    if not contours or area == 0:
        return {
            "area_px": 0,
            "perimeter_px": 0.0,
            "bbox_w_px": 0,
            "bbox_h_px": 0,
            "circularity": None
        }
        
    c = max(contours, key=cv2.contourArea)
    perimeter = float(cv2.arcLength(c, True))
    x, y, w, h = cv2.boundingRect(c)
    circ = (4.0 * np.pi * area) / (perimeter ** 2) if perimeter > 0 else None
    
    return {
        "area_px": area,
        "perimeter_px": round(perimeter, 2),
        "bbox_w_px": int(w),
        "bbox_h_px": int(h),
        "circularity": round(float(circ), 4) if circ is not None else None
    }

def overlay_mask_monitoring(rgb: np.ndarray, mask: np.ndarray, alpha: float = 0.42) -> np.ndarray:
    """
    Notebook 3 visual overlay:
    Green tint on mask, red boundary contours (2px).
    """
    out = rgb.copy().astype(np.float32)
    tint = np.zeros_like(out)
    tint[:, :, 1] = 255  # Green tint
    m = mask > 0
    out[m] = (1.0 - alpha) * out[m] + alpha * tint[m]
    contours, _ = cv2.findContours(mask.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    out_clipped = np.clip(out, 0, 255).astype(np.uint8)
    cv2.drawContours(out_clipped, contours, -1, (255, 0, 0), 2)  # Red contour
    return out_clipped

def run_longitudinal_monitoring(image1_pil: Image.Image, image2_pil: Image.Image):
    """
    Executes full longitudinal lesion monitoring pipeline.
    """
    # 1. Preprocess both images
    img1 = preprocess_for_monitoring(image1_pil, max_side=768)
    img2 = preprocess_for_monitoring(image2_pil, max_side=768)
    
    # 2. Registration
    img2_aligned, reg_method, inliers, reg_status = align_to_reference(img1, img2)
    
    # 3. Segmentation
    mask1, seg1_method = estimate_mask(img1)
    mask2, seg2_method = estimate_mask(img2_aligned)
    
    # 4. Measurements
    m1 = measure_mask(mask1)
    m2 = measure_mask(mask2)
    
    # 5. Percentage changes
    metrics_keys = [
        ("area_px", "Lesion Area (px)"),
        ("perimeter_px", "Perimeter (px)"),
        ("bbox_w_px", "Bounding Box Width (px)"),
        ("bbox_h_px", "Bounding Box Height (px)"),
        ("circularity", "Circularity Index")
    ]
    
    comparison_table = []
    for key, label in metrics_keys:
        v1 = m1.get(key)
        v2 = m2.get(key)
        pct_change = None
        if v1 is not None and v2 is not None and v1 != 0 and np.isfinite(v1) and np.isfinite(v2):
            pct_change = round(float(((v2 - v1) / v1) * 100.0), 2)
            
        comparison_table.append({
            "metric": label,
            "previous_value": v1,
            "current_value": v2,
            "percentage_change": pct_change
        })
        
    # 6. Quality Warnings
    quality_warning = None
    if reg_status != "confirmed":
        quality_warning = (
            "Registration unconfirmed: insufficient visual feature inliers. "
            "Direct pixel comparison may reflect viewpoint or scale differences."
        )
    elif m1["area_px"] == 0 or m2["area_px"] == 0:
        quality_warning = "Lesion mask could not be reliably segmented in one or both images."
        
    # 7. Visual Outputs
    ov1 = overlay_mask_monitoring(img1, mask1)
    ov2 = overlay_mask_monitoring(img2_aligned, mask2)
    diff_vis = create_difference_map(mask1, mask2)
    
    # Save images
    p_img1 = save_image_array(img1, prefix="mon_prev")
    p_img2 = save_image_array(img2, prefix="mon_curr_raw")
    p_aligned = save_image_array(img2_aligned, prefix="mon_aligned")
    p_m1 = save_image_array(mask1, prefix="mon_mask1")
    p_m2 = save_image_array(mask2, prefix="mon_mask2")
    p_diff = save_image_array(diff_vis, prefix="mon_diff")
    p_ov1 = save_image_array(ov1, prefix="mon_ov1")
    p_ov2 = save_image_array(ov2, prefix="mon_ov2")
    
    return {
        "registration_method": reg_method,
        "registration_status": reg_status,
        "registration_inliers": inliers,
        "segmentation_methods": f"{seg1_method} / {seg2_method}",
        "previous_measurements": m1,
        "current_measurements": m2,
        "comparison_table": comparison_table,
        "quality_warning": quality_warning,
        "filenames": {
            "previous_image": p_img1,
            "current_image": p_img2,
            "aligned_current": p_aligned,
            "previous_mask": p_m1,
            "current_mask": p_m2,
            "difference_mask": p_diff,
            "previous_overlay": p_ov1,
            "current_overlay": p_ov2
        }
    }

