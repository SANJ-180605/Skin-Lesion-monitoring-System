import io
import uuid
from pathlib import Path
from typing import Tuple
from fastapi import UploadFile, HTTPException, status
from PIL import Image, ImageOps
from app.config import settings

def validate_image_upload(file: UploadFile, content: bytes) -> Tuple[str, Image.Image]:
    """
    Validates uploaded image file:
    1. Size within limit (settings.MAX_UPLOAD_SIZE_MB)
    2. File extension allowed
    3. MIME type valid
    4. Image actually decodable by Pillow
    Returns a secure unique filename and the PIL Image object.
    """
    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if len(content) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Image file exceeds maximum allowed size of {settings.MAX_UPLOAD_SIZE_MB}MB."
        )

    # Check extension
    orig_ext = Path(file.filename or "image.jpg").suffix.lower()
    if orig_ext not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file extension '{orig_ext}'. Allowed: {', '.join(settings.ALLOWED_EXTENSIONS)}"
        )

    # Check MIME type
    if file.content_type and file.content_type.lower() not in settings.ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid MIME type '{file.content_type}'. Must be a supported image format."
        )

    # Check image decodability and integrity
    try:
        image = Image.open(io.BytesIO(content))
        image.verify()  # Verifies file integrity
        # Re-open for actual processing (verify closes/corrupts internal pointer)
        image = Image.open(io.BytesIO(content))
        # Correct orientation if EXIF tags exist
        image = ImageOps.exif_transpose(image)
        # Convert to RGB
        image = image.convert("RGB")
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Corrupt or invalid image file: {str(e)}"
        )

    # Generate secure unique filename
    unique_filename = f"{uuid.uuid4().hex}{orig_ext if orig_ext in ['.jpg', '.png'] else '.jpg'}"
    return unique_filename, image

