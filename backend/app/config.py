import os
from pathlib import Path
from typing import List
from pydantic_settings import BaseSettings

BASE_DIR = Path(__file__).resolve().parent.parent

class Settings(BaseSettings):
    APP_NAME: str = "Skin Lesion Classification & Monitoring System"
    VERSION: str = "1.0.0"
    DEBUG: bool = False
    
    # MongoDB Atlas
    MONGODB_URI: str = "mongodb://localhost:27017"
    DATABASE_NAME: str = "skin_lesion_db"
    
    # JWT Authentication
    JWT_SECRET: str = "medical-research-skin-lesion-jwt-secret-key-2026-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    # Model Checkpoints (relative to backend or absolute)
    UNET_MODEL_PATH: str = str(BASE_DIR / "saved_models" / "unet" / "model1_selected_best.keras")
    UNET_FALLBACK_MODEL_PATH: str = str(BASE_DIR / "saved_models" / "unet" / "baseline_bce_dice_best.keras")
    CLASSIFICATION_MODEL_PATH: str = str(BASE_DIR / "saved_models" / "efficientnet" / "best_three_class_model.keras")
    
    # Image Storage & Upload limits
    UPLOAD_DIR: str = str(BASE_DIR / "uploads")
    MAX_UPLOAD_SIZE_MB: int = 15
    ALLOWED_EXTENSIONS: List[str] = [".jpg", ".jpeg", ".png", ".bmp", ".webp"]
    ALLOWED_MIME_TYPES: List[str] = ["image/jpeg", "image/png", "image/bmp", "image/webp"]
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]
    
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    class Config:
        env_file = str(BASE_DIR / ".env")
        env_file_encoding = "utf-8"
        extra = "ignore"

settings = Settings()
Path(settings.UPLOAD_DIR).mkdir(parents=True, exist_ok=True)

