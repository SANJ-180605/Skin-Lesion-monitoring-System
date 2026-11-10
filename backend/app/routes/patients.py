import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends, Query, status
from app.models.schemas import PatientCreate, PatientUpdate, PatientResponse
from app.utils.security import get_current_user, get_optional_current_user
from app.database import (
    db_create_patient,
    db_find_patient,
    db_list_patients,
    db_update_patient,
    db_delete_patient,
    db_list_analyses,
    db_list_monitoring_sessions
)

router = APIRouter(prefix="/api/patients", tags=["Patient Management"])

@router.post("", response_model=PatientResponse, status_code=status.HTTP_201_CREATED)
async def create_patient(
    patient_in: PatientCreate,
    current_user: Optional[dict] = Depends(get_optional_current_user)
):
    user_id = current_user["user_id"] if current_user else "ANONYMOUS_RESEARCHER"
    patient_id = f"PAT-{uuid.uuid4().hex[:6].upper()}"
    now = datetime.now(timezone.utc)
    
    patient_doc = {
        "patient_id": patient_id,
        "user_id": user_id,
        "patient_name": patient_in.patient_name,
        "age": patient_in.age,
        "gender": patient_in.gender,
        "notes": patient_in.notes,
        "created_at": now,
        "updated_at": now
    }
    
    await db_create_patient(patient_doc)
    return PatientResponse(**patient_doc, analyses_count=0, monitoring_count=0)

@router.get("", response_model=List[PatientResponse])
async def list_patients(
    search: Optional[str] = Query(None, description="Search by ID or name"),
    current_user: Optional[dict] = Depends(get_optional_current_user)
):
    user_id = current_user["user_id"] if current_user else None
    patients = await db_list_patients(user_id=None, search=search)  # Return shared researcher patient pool
    
    # Annotate counts
    response_list = []
    for p in patients:
        analyses = await db_list_analyses(patient_id=p["patient_id"])
        monitoring = await db_list_monitoring_sessions(patient_id=p["patient_id"])
        response_list.append(PatientResponse(
            patient_id=p["patient_id"],
            user_id=p.get("user_id", "ANONYMOUS"),
            patient_name=p["patient_name"],
            age=p.get("age"),
            gender=p.get("gender"),
            notes=p.get("notes"),
            created_at=p.get("created_at", datetime.now(timezone.utc)),
            updated_at=p.get("updated_at", datetime.now(timezone.utc)),
            analyses_count=len(analyses),
            monitoring_count=len(monitoring)
        ))
    return response_list

@router.get("/{patient_id}", response_model=PatientResponse)
async def get_patient(patient_id: str):
    p = await db_find_patient(patient_id)
    if not p:
        raise HTTPException(status_code=404, detail=f"Patient '{patient_id}' not found.")
        
    analyses = await db_list_analyses(patient_id=patient_id)
    monitoring = await db_list_monitoring_sessions(patient_id=patient_id)
    return PatientResponse(
        patient_id=p["patient_id"],
        user_id=p.get("user_id", "ANONYMOUS"),
        patient_name=p["patient_name"],
        age=p.get("age"),
        gender=p.get("gender"),
        notes=p.get("notes"),
        created_at=p.get("created_at", datetime.now(timezone.utc)),
        updated_at=p.get("updated_at", datetime.now(timezone.utc)),
        analyses_count=len(analyses),
        monitoring_count=len(monitoring)
    )

@router.put("/{patient_id}", response_model=PatientResponse)
async def update_patient(
    patient_id: str,
    patient_in: PatientUpdate,
    current_user: Optional[dict] = Depends(get_optional_current_user)
):
    p = await db_find_patient(patient_id)
    if not p:
        raise HTTPException(status_code=404, detail=f"Patient '{patient_id}' not found.")
        
    updates = {k: v for k, v in patient_in.model_dump().items() if v is not None}
    updated = await db_update_patient(patient_id, updates)
    
    analyses = await db_list_analyses(patient_id=patient_id)
    monitoring = await db_list_monitoring_sessions(patient_id=patient_id)
    return PatientResponse(
        patient_id=updated["patient_id"],
        user_id=updated.get("user_id", "ANONYMOUS"),
        patient_name=updated["patient_name"],
        age=updated.get("age"),
        gender=updated.get("gender"),
        notes=updated.get("notes"),
        created_at=updated.get("created_at", datetime.now(timezone.utc)),
        updated_at=updated.get("updated_at", datetime.now(timezone.utc)),
        analyses_count=len(analyses),
        monitoring_count=len(monitoring)
    )

@router.delete("/{patient_id}")
async def delete_patient(
    patient_id: str,
    current_user: Optional[dict] = Depends(get_optional_current_user)
):
    p = await db_find_patient(patient_id)
    if not p:
        raise HTTPException(status_code=404, detail=f"Patient '{patient_id}' not found.")
        
    success = await db_delete_patient(patient_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to delete patient record.")
    return {"message": f"Patient '{patient_id}' and all associated records deleted successfully."}

