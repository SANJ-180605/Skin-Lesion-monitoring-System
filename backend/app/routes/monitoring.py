import os
import uuid
from datetime import datetime, timezone
from typing import List, Optional
from PIL import Image
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends, status
from app.config import settings
from app.models.schemas import MonitoringResult
from app.utils.validators import validate_image_upload
from app.utils.security import get_optional_current_user
from app.database import (
    save_image_to_gridfs,
    db_create_monitoring_session,
    db_find_monitoring_session,
    db_list_monitoring_sessions,
    db_find_patient,
    db_find_analysis
)
from app.services.monitoring_service import run_longitudinal_monitoring

router = APIRouter(prefix="/api/monitoring", tags=["Longitudinal Lesion Monitoring"])

@router.post("/compare", response_model=MonitoringResult)
async def compare_lesions(
    current_image: UploadFile = File(..., description="Follow-up lesion image"),
    previous_image: Optional[UploadFile] = File(None, description="Baseline lesion image"),
    previous_analysis_id: Optional[str] = Form(None),
    spot_name: Optional[str] = Form("Skin Spot"),
    patient_id: Optional[str] = Form(None),
    notes: Optional[str] = Form(None),
    current_user: Optional[dict] = Depends(get_optional_current_user)
):
    """
    Executes longitudinal monitoring workflow from Notebook 3:
    1. EXIF orientation correction and Lanczos aspect-ratio resize
    2. Co-registration via ORB + RANSAC homography
    3. Lesion mask estimation (GrabCut + Otsu fallback)
    4. Quantitative morphometric feature extraction (area, perimeter, bbox, circularity)
    5. Percentage change analysis and color-coded difference map
    Allows choosing an earlier photo either via direct file upload OR by past analysis ID.
    """
    # 1. Resolve earlier photo (file upload or past saved test)
    prev_fname = None
    prev_pil = None
    if previous_image and previous_image.filename:
        prev_bytes = await previous_image.read()
        prev_fname, prev_pil = validate_image_upload(previous_image, prev_bytes)
        await save_image_to_gridfs(prev_fname, prev_bytes, previous_image.content_type or "image/jpeg")
    elif previous_analysis_id:
        prev_analysis = await db_find_analysis(previous_analysis_id)
        if not prev_analysis:
            raise HTTPException(status_code=404, detail=f"Previous spot check '{previous_analysis_id}' not found.")
        img_url = prev_analysis.get("original_image_url", "")
        img_name = os.path.basename(img_url)
        local_path = os.path.join(settings.UPLOAD_DIR, img_name)
        if not os.path.exists(local_path):
            raise HTTPException(status_code=404, detail="Previous spot image file not found on server.")
        prev_pil = Image.open(local_path).convert("RGB")
        prev_fname = img_name
        if not spot_name or spot_name == "Skin Spot":
            spot_name = prev_analysis.get("spot_name", "Skin Spot")
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please provide an earlier photo: either upload an image file or select from past spot checks."
        )

    # 2. Validate follow-up image
    curr_bytes = await current_image.read()
    curr_fname, curr_pil = validate_image_upload(current_image, curr_bytes)
    await save_image_to_gridfs(curr_fname, curr_bytes, current_image.content_type or "image/jpeg")
    
    if patient_id:
        patient = await db_find_patient(patient_id)
        if not patient:
            raise HTTPException(status_code=404, detail=f"Patient '{patient_id}' not found.")
            
    # 3. Run monitoring pipeline
    result = run_longitudinal_monitoring(prev_pil, curr_pil)
    
    monitoring_id = f"MON-{uuid.uuid4().hex[:8].upper()}"
    now = datetime.now(timezone.utc)
    fns = result["filenames"]
    
    monitoring_doc = {
        "monitoring_id": monitoring_id,
        "patient_id": patient_id,
        "spot_name": (spot_name or "").strip() or "Skin Spot",
        "user_id": current_user["user_id"] if current_user else "ANONYMOUS",
        "registration_method": result["registration_method"],
        "registration_status": result["registration_status"],
        "registration_inliers": result["registration_inliers"],
        "previous_measurements": result["previous_measurements"],
        "current_measurements": result["current_measurements"],
        "comparison_table": result["comparison_table"],
        "previous_image_url": f"/uploads/{prev_fname}",
        "current_image_url": f"/uploads/{curr_fname}",
        "aligned_current_url": f"/uploads/{fns['aligned_current']}",
        "previous_mask_url": f"/uploads/{fns['previous_mask']}",
        "current_mask_url": f"/uploads/{fns['current_mask']}",
        "difference_mask_url": f"/uploads/{fns['difference_mask']}",
        "previous_overlay_url": f"/uploads/{fns['previous_overlay']}",
        "current_overlay_url": f"/uploads/{fns['current_overlay']}",
        "quality_warning": result.get("quality_warning"),
        "notes": notes,
        "created_at": now
    }
    
    await db_create_monitoring_session(monitoring_doc)
    return MonitoringResult(**monitoring_doc)

@router.get("/{monitoring_id}", response_model=MonitoringResult)
async def get_monitoring_session(monitoring_id: str):
    doc = await db_find_monitoring_session(monitoring_id)
    if not doc:
        raise HTTPException(status_code=404, detail=f"Monitoring session '{monitoring_id}' not found.")
    return MonitoringResult(**doc)

@router.get("/patient/{patient_id}", response_model=List[MonitoringResult])
async def get_patient_monitoring_sessions(patient_id: str):
    sessions = await db_list_monitoring_sessions(patient_id=patient_id)
    return [MonitoringResult(**m) for m in sessions]

