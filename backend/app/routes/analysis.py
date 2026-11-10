import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends, status
from app.models.schemas import AnalysisResult, AnalysisSaveRequest
from app.utils.validators import validate_image_upload
from app.utils.security import get_optional_current_user
from app.database import (
    save_image_to_gridfs,
    db_create_analysis,
    db_find_analysis,
    db_list_analyses,
    db_find_patient
)
from app.services.unet_service import run_unet_segmentation
from app.services.classification_service import run_three_class_classification

router = APIRouter(prefix="/api/analysis", tags=["Lesion Segmentation & Classification"])

@router.post("/predict", response_model=AnalysisResult)
async def predict_lesion(
    file: UploadFile = File(...),
    patient_id: Optional[str] = Form(None),
    spot_name: Optional[str] = Form("Skin Spot"),
    notes: Optional[str] = Form(None),
    current_user: Optional[dict] = Depends(get_optional_current_user)
):
    """
    Complete analysis pipeline:
    1. Validates and secures uploaded dermoscopic image
    2. Runs trained Standard U-Net segmentation (256x256, [0, 1] normalized)
    3. Runs trained Three-Class EfficientNetB0 classification (224x224, [0, 255] range)
    4. Computes softmax confidence score and class-wise probability breakdown
    5. Stores references in MongoDB Atlas / GridFS
    """
    content = await file.read()
    filename, pil_image = validate_image_upload(file, content)
    
    # Save original image to storage / GridFS
    await save_image_to_gridfs(filename, content, file.content_type or "image/jpeg")
    
    # Verify patient if provided
    if patient_id:
        patient = await db_find_patient(patient_id)
        if not patient:
            raise HTTPException(status_code=404, detail=f"Patient '{patient_id}' not found.")
            
    # 1. Run U-Net Segmentation
    seg_result = run_unet_segmentation(pil_image, filename)
    
    # 2. Run 3-Class EfficientNetB0 Classification
    cls_result = run_three_class_classification(pil_image)
    
    # Generate analysis ID
    analysis_id = f"ANL-{uuid.uuid4().hex[:8].upper()}"
    now = datetime.now(timezone.utc)
    
    analysis_doc = {
        "analysis_id": analysis_id,
        "patient_id": patient_id,
        "spot_name": (spot_name or "").strip() or "Skin Spot",
        "user_id": current_user["user_id"] if current_user else "ANONYMOUS",
        "predicted_class": cls_result["predicted_class"],
        "confidence_score": cls_result["confidence_score"],
        "probabilities": cls_result["probabilities"],
        "original_image_url": f"/uploads/{filename}",
        "mask_image_url": f"/uploads/{seg_result['mask_filename']}",
        "overlay_image_url": f"/uploads/{seg_result['overlay_filename']}",
        "segmentation_metrics": seg_result["metrics"],
        "model_name": cls_result["model_name"],
        "model_version": cls_result["model_version"],
        "notes": notes,
        "created_at": now
    }
    
    await db_create_analysis(analysis_doc)
    return AnalysisResult(**analysis_doc)

@router.get("/{analysis_id}", response_model=AnalysisResult)
async def get_analysis(analysis_id: str):
    doc = await db_find_analysis(analysis_id)
    if not doc:
        raise HTTPException(status_code=404, detail=f"Analysis record '{analysis_id}' not found.")
    return AnalysisResult(**doc)

@router.get("/patient/{patient_id}", response_model=List[AnalysisResult])
async def get_patient_analyses(patient_id: str):
    analyses = await db_list_analyses(patient_id=patient_id)
    return [AnalysisResult(**a) for a in analyses]

@router.put("/{analysis_id}/link", response_model=AnalysisResult)
async def link_analysis_to_patient(analysis_id: str, save_req: AnalysisSaveRequest):
    patient = await db_find_patient(save_req.patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail=f"Patient '{save_req.patient_id}' not found.")
        
    doc = await db_find_analysis(analysis_id)
    if not doc:
        raise HTTPException(status_code=404, detail=f"Analysis '{analysis_id}' not found.")
        
    doc["patient_id"] = save_req.patient_id
    if save_req.notes:
        doc["notes"] = save_req.notes
    if save_req.spot_name:
        doc["spot_name"] = save_req.spot_name
        
    from app.database import db
    if db.is_connected and db.db is not None:
        update_fields = {"patient_id": save_req.patient_id}
        if save_req.notes:
            update_fields["notes"] = save_req.notes
        if save_req.spot_name:
            update_fields["spot_name"] = save_req.spot_name
        await db.db.analyses.update_one(
            {"analysis_id": analysis_id},
            {"$set": update_fields}
        )
    else:
        db._memory_analyses[analysis_id] = doc
        
    return AnalysisResult(**doc)

