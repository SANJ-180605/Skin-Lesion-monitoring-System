import numpy as np
from PIL import Image, ImageOps
import cv2

def preprocess_for_unet(pil_image: Image.Image) -> np.ndarray:
    """
    Model 1 preprocessing (U-Net):
    - Input size: 256x256x3
    - Mode: RGB
    - Normalization: [0, 1] (divide by 255.0)
    - Returns batch array of shape (1, 256, 256, 3) with float32
    """
    img = pil_image.convert("RGB")
    img_resized = img.resize((256, 256), Image.Resampling.BILINEAR)
    arr = np.array(img_resized, dtype=np.float32) / 255.0
    return np.expand_dims(arr, axis=0)

def preprocess_for_efficientnet(pil_image: Image.Image) -> np.ndarray:
    """
    Model 2 preprocessing (EfficientNetB0):
    - Input size: 224x224x3
    - Mode: RGB
    - Normalization: Keep in range 0-255 (DO NOT divide by 255.0 because
      Keras EfficientNetB0 includes its own internal Rescaling layer)
    - Returns batch array of shape (1, 224, 224, 3) with float32
    """
    img = pil_image.convert("RGB")
    img_resized = img.resize((224, 224), Image.Resampling.LANCZOS)
    arr = np.array(img_resized, dtype=np.float32)
    return np.expand_dims(arr, axis=0)

def preprocess_for_monitoring(pil_image: Image.Image, max_side: int = 768) -> np.ndarray:
    """
    Model 3 preprocessing (Monitoring CV pipeline):
    - EXIF orientation correction
    - RGB conversion
    - Resize longest side to at most max_side (768) maintaining aspect ratio
    - Returns uint8 numpy array (H, W, 3)
    """
    im = ImageOps.exif_transpose(pil_image).convert("RGB")
    w, h = im.size
    scale = min(1.0, max_side / max(w, h))
    if scale < 1.0:
        im = im.resize((int(w * scale), int(h * scale)), Image.Resampling.LANCZOS)
    return np.array(im, dtype=np.uint8)

