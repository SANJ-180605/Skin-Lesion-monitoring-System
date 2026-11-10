import os
import sys
from pathlib import Path
from datetime import datetime, timezone
from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse

# Add Windows DLL search paths for TensorFlow before any imports
_root = Path(__file__).resolve().parent.parent
_candidate_dlls = [
    _root / "dlls",
    Path(r"C:\Users\User1\.gemini\antigravity\scratch\dlls")
]
for _d in _candidate_dlls:
    if _d.exists():
        try:
            os.add_dll_directory(str(_d))
            os.environ["PATH"] = str(_d) + os.pathsep + os.environ.get("PATH", "")
        except Exception:
            pass

from app.config import settings
from app.database import connect_to_database, close_database_connection, db
from app.ml.model_loader import (
    load_unet_model,
    load_classification_model,
    get_loaded_unet,
    get_loaded_classification,
    unet_metadata,
    classification_metadata
)

# Route imports
from app.routes import auth, patients, analysis, monitoring, history, reports

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("app")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup sequence
    logger.info("Initializing Skin Lesion Analysis & Monitoring Application...")
    
    # 1. Connect database
    await connect_to_database()
    
    # 2. Load ML models once (as required)
    logger.info("Loading ML checkpoints...")
    load_unet_model(settings.UNET_MODEL_PATH, settings.UNET_FALLBACK_MODEL_PATH)
    load_classification_model(settings.CLASSIFICATION_MODEL_PATH)
    
    yield
    
    # Shutdown sequence
    logger.info("Shutting down application...")
    await close_database_connection()

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    description="Research-grade Skin Lesion Segmentation, Three-Class Classification, and Longitudinal Monitoring System.",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount uploaded images directory for static serving
Path(settings.UPLOAD_DIR).mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Include Routers
app.include_router(auth.router)
app.include_router(patients.router)
app.include_router(analysis.router)
app.include_router(monitoring.router)
app.include_router(history.router)
app.include_router(reports.router)

# System Health & Status Endpoints
@app.get("/api/health")
async def health_check():
    u_mod, u_meta = get_loaded_unet()
    c_mod, c_meta = get_loaded_classification()
    
    return {
        "status": "healthy",
        "app_name": settings.APP_NAME,
        "version": settings.VERSION,
        "database": "connected (Atlas)" if db.is_connected else "active (in-memory persistent fallback)",
        "models_ready": bool(u_mod is not None and c_mod is not None),
        "timestamp": datetime.now(timezone.utc)
    }

@app.get("/api/models/status")
async def model_status():
    u_mod, u_meta = get_loaded_unet()
    c_mod, c_meta = get_loaded_classification()
    
    return {
        "unet_segmentation": {
            **u_meta,
            "is_ready": bool(u_mod is not None)
        },
        "efficientnet_classification": {
            **c_meta,
            "is_ready": bool(c_mod is not None)
        },
        "monitoring_pipeline": {
            "name": "Longitudinal CV Lesion Monitoring",
            "type": "Classical Computer Vision (ORB + RANSAC + GrabCut)",
            "is_deep_learning": False,
            "status": "active"
        }
    }

@app.get("/")
async def root():
    return {
        "app": settings.APP_NAME,
        "version": settings.VERSION,
        "docs_url": "/docs",
        "health_url": "/api/health",
        "status": "running"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=True)

