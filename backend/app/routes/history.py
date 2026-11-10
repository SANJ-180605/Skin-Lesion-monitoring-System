from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Depends
from app.models.schemas import DashboardStats
from app.database import (
    db_list_analyses,
    db_list_monitoring_sessions,
    db_get_dashboard_counts,
    db_find_patient
)

router = APIRouter(prefix="/api/history", tags=["History & Dashboard"])

@router.get("/dashboard", response_model=DashboardStats)
async def get_dashboard_data():
    """
    Returns actual aggregated database metrics for the research dashboard.
    Does not invent fake data. Empty state if database is fresh.
    """
    total_p, total_a, total_m, dist = await db_get_dashboard_counts()
    recent_a = await db_list_analyses(limit=5)
    recent_m = await db_list_monitoring_sessions(limit=5)
    
    return DashboardStats(
        total_patients=total_p,
        total_analyses=total_a,
        total_monitoring_sessions=total_m,
        class_distribution=dist,
        recent_analyses=recent_a,
        recent_monitoring=recent_m
    )

@router.get("")
async def get_all_history(limit: int = 50):
    analyses = await db_list_analyses(limit=limit)
    monitoring = await db_list_monitoring_sessions(limit=limit)
    return {
        "analyses": analyses,
        "monitoring": monitoring
    }

@router.get("/patient/{patient_id}")
async def get_patient_history(patient_id: str):
    patient = await db_find_patient(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail=f"Patient '{patient_id}' not found.")
        
    analyses = await db_list_analyses(patient_id=patient_id)
    monitoring = await db_list_monitoring_sessions(patient_id=patient_id)
    return {
        "patient": patient,
        "analyses": analyses,
        "monitoring": monitoring
    }

