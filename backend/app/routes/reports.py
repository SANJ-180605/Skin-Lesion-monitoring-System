from fastapi import APIRouter, HTTPException, Response
from app.database import db_find_analysis, db_find_monitoring_session, db_find_patient
from app.services.report_service import generate_analysis_pdf, generate_monitoring_pdf

router = APIRouter(prefix="/api/reports", tags=["PDF Reports"])

@router.get("/analysis/{analysis_id}")
async def get_analysis_report(analysis_id: str):
    analysis = await db_find_analysis(analysis_id)
    if not analysis:
        raise HTTPException(status_code=404, detail=f"Analysis record '{analysis_id}' not found.")
        
    patient = None
    if analysis.get("patient_id"):
        patient = await db_find_patient(analysis["patient_id"])
        
    pdf_bytes = generate_analysis_pdf(analysis, patient)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=Report_{analysis_id}.pdf"
        }
    )

@router.get("/monitoring/{monitoring_id}")
async def get_monitoring_report(monitoring_id: str):
    monitoring = await db_find_monitoring_session(monitoring_id)
    if not monitoring:
        raise HTTPException(status_code=404, detail=f"Monitoring session '{monitoring_id}' not found.")
        
    patient = None
    if monitoring.get("patient_id"):
        patient = await db_find_patient(monitoring["patient_id"])
        
    pdf_bytes = generate_monitoring_pdf(monitoring, patient)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=Monitoring_Report_{monitoring_id}.pdf"
        }
    )

