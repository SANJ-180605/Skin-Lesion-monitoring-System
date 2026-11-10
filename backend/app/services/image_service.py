import os
import io
import uuid
import numpy as np
from PIL import Image, ImageOps
import cv2
from app.config import settings
from app.database import save_image_to_gridfs

def save_image_array(arr: np.ndarray, prefix: str = "img") -> str:
    """
    Saves a numpy array (RGB or Grayscale uint8) to disk and returns unique filename.
    """
    filename = f"{prefix}_{uuid.uuid4().hex[:12]}.png"
    filepath = os.path.join(settings.UPLOAD_DIR, filename)
    
    if len(arr.shape) == 2:
        im = Image.fromarray(arr.astype(np.uint8), mode="L")
    elif len(arr.shape) == 3 and arr.shape[2] == 3:
        im = Image.fromarray(arr.astype(np.uint8), mode="RGB")
    elif len(arr.shape) == 3 and arr.shape[2] == 4:
        im = Image.fromarray(arr.astype(np.uint8), mode="RGBA")
    else:
        im = Image.fromarray(arr.astype(np.uint8))
        
    im.save(filepath, format="PNG")
    return filename

def create_segmentation_overlay(original_rgb: np.ndarray, binary_mask: np.ndarray, alpha: float = 0.42) -> np.ndarray:
    """
    Creates visual overlay:
    - Red lesion boundary contour
    - Soft green or teal tinted mask interior
    Matching notebook overlay aesthetics.
    """
    h, w = original_rgb.shape[:2]
    # Ensure binary_mask matches original image dimensions
    if binary_mask.shape[:2] != (h, w):
        binary_mask = cv2.resize(binary_mask, (w, h), interpolation=cv2.INTER_NEAREST)
        
    mask_bool = (binary_mask > 0)
    out = original_rgb.copy().astype(np.float32)
    
    # Tint interior (teal / green: RGB [0, 200, 150])
    tint = np.zeros_like(out)
    tint[:, :] = [0, 200, 150]
    out[mask_bool] = (1.0 - alpha) * out[mask_bool] + alpha * tint[mask_bool]
    
    # Boundary contour in vivid red [230, 30, 30]
    contours, _ = cv2.findContours(binary_mask.astype(np.uint8) * 255, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    out_uint8 = np.clip(out, 0, 255).astype(np.uint8)
    cv2.drawContours(out_uint8, contours, -1, (230, 30, 30), 2)
    
    return out_uint8

def create_difference_map(mask1: np.ndarray, mask2: np.ndarray) -> np.ndarray:
    """
    Generates color-coded difference map:
    - Yellow: Stable lesion area (both mask1 and mask2)
    - Red: Growth / New area in mask2
    - Blue: Regression / Area only in mask1
    """
    h, w = mask1.shape[:2]
    if mask2.shape[:2] != (h, w):
        mask2 = cv2.resize(mask2, (w, h), interpolation=cv2.INTER_NEAREST)
        
    m1 = (mask1 > 0).astype(np.uint8)
    m2 = (mask2 > 0).astype(np.uint8)
    
    diff_rgb = np.zeros((h, w, 3), dtype=np.uint8)
    
    # Overlap (Stable): Yellow [240, 200, 40]
    overlap = np.logical_and(m1 == 1, m2 == 1)
    diff_rgb[overlap] = [240, 200, 40]
    
    # New / Growth in image 2: Red [235, 50, 50]
    growth = np.logical_and(m1 == 0, m2 == 1)
    diff_rgb[growth] = [235, 50, 50]
    
    # Shrinkage / Region in image 1 only: Blue [40, 120, 240]
    shrink = np.logical_and(m1 == 1, m2 == 0)
    diff_rgb[shrink] = [40, 120, 240]
    
    return diff_rgb

