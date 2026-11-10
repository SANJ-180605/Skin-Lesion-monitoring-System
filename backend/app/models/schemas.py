from datetime import datetime
from typing import List, Optional, Dict, Any, Union
from pydantic import BaseModel, Field

# ----------------- User & Auth Schemas -----------------
class UserRegister(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: str = Field(..., min_length=5, max_length=255, pattern=r"^[\w\.\+\-]+@[\w\.\-]+\.[a-zA-Z]{2,}$")
    password: str = Field(..., min_length=6, max_length=128)
    role: Optional[str] = "researcher"

class UserLogin(BaseModel):
    email: str = Field(..., min_length=5, max_length=255)
    password: str

class UserResponse(BaseModel):
    user_id: str
    name: str
    email: str
    role: str
    created_at: datetime

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# ----------------- Patient Schemas -----------------
class PatientCreate(BaseModel):
    patient_name: str = Field(..., min_length=2, max_length=100, description="Patient name or pseudonym")
    age: Optional[int] = Field(None, ge=0, le=130)
    gender: Optional[str] = Field(None, max_length=20)
    notes: Optional[str] = Field(None, max_length=2000)

class PatientUpdate(BaseModel):
    patient_name: Optional[str] = Field(None, min_length=2, max_length=100)
    age: Optional[int] = Field(None, ge=0, le=130)
    gender: Optional[str] = Field(None, max_length=20)
    notes: Optional[str] = Field(None, max_length=2000)

class PatientResponse(BaseModel):
    patient_id: str
    user_id: str
    patient_name: str
    age: Optional[int] = None
    gender: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    analyses_count: int = 0
    monitoring_count: int = 0

# ----------------- Analysis Schemas -----------------
class ClassProbability(BaseModel):
    class_name: str
    probability: float  # 0.0 to 1.0
    percentage: float   # 0.0 to 100.0

class AnalysisResult(BaseModel):
    analysis_id: str
    patient_id: Optional[str] = None
    spot_name: Optional[str] = "Skin Spot"
    predicted_class: str
    confidence_score: float  # 0.0 to 100.0
    probabilities: List[ClassProbability]
    original_image_url: str
    mask_image_url: str
    overlay_image_url: str
    segmentation_metrics: Optional[Dict[str, Any]] = None
    model_name: str
    model_version: str
    created_at: datetime
    notes: Optional[str] = None

class AnalysisSaveRequest(BaseModel):
    patient_id: str
    spot_name: Optional[str] = None
    notes: Optional[str] = None

# ----------------- Monitoring Schemas -----------------
class LesionMeasurements(BaseModel):
    area_px: int
    perimeter_px: float
    bbox_w_px: int
    bbox_h_px: int
    circularity: Optional[float] = None

class MeasurementDifference(BaseModel):
    metric: str
    previous_value: Union[int, float, None]
    current_value: Union[int, float, None]
    percentage_change: Optional[float] = None  # ((new - old) / old) * 100

class MonitoringResult(BaseModel):
    monitoring_id: str
    patient_id: Optional[str] = None
    spot_name: Optional[str] = "Skin Spot"
    registration_method: str
    registration_status: str  # "confirmed" or "unconfirmed_fallback"
    registration_inliers: int
    previous_measurements: LesionMeasurements
    current_measurements: LesionMeasurements
    comparison_table: List[MeasurementDifference]
    previous_image_url: str
    current_image_url: str
    aligned_current_url: str
    previous_mask_url: str
    current_mask_url: str
    difference_mask_url: str
    previous_overlay_url: str
    current_overlay_url: str
    quality_warning: Optional[str] = None
    created_at: datetime
    notes: Optional[str] = None

# ----------------- History & Dashboard -----------------
class DashboardStats(BaseModel):
    total_patients: int
    total_analyses: int
    total_monitoring_sessions: int
    class_distribution: Dict[str, int]
    recent_analyses: List[Dict[str, Any]]
    recent_monitoring: List[Dict[str, Any]]

# ----------------- Model Metadata & Health -----------------
class SingleModelInfo(BaseModel):
    name: str
    architecture: str
    checkpoint_path: str
    input_shape: List[int]
    status: str  # "loaded", "missing_checkpoint", "error"
    classes: Optional[List[str]] = None
    error_message: Optional[str] = None

class ModelStatusResponse(BaseModel):
    unet_segmentation: SingleModelInfo
    efficientnet_classification: SingleModelInfo
    monitoring_pipeline: Dict[str, Any]

class HealthResponse(BaseModel):
    status: str
    database: str
    models_ready: bool
    version: str
    timestamp: datetime
