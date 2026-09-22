from datetime import datetime
from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/screenings", tags=["screening"])


class HealthData(BaseModel):
    patient_id: str
    systolic_bp: Optional[float] = None
    diastolic_bp: Optional[float] = None
    blood_glucose: Optional[float] = None
    haemoglobin: Optional[float] = None
    bmi: Optional[float] = None
    symptoms: Optional[str] = None


@router.post("/health-data")
def save_health_data(payload: HealthData):
    return {
        "status": "accepted",
        "patient_id": payload.patient_id,
        "health_data": payload.model_dump(),
        "recorded_at": datetime.utcnow().isoformat(),
    }


@router.post("/assess")
def assess_screening(payload: HealthData):
    # The production implementation must call the validated disease-assessment
    # services/models. This endpoint deliberately does not invent a clinical score.
    available = {
        "diabetes": payload.blood_glucose is not None,
        "cardiovascular": any(
            x is not None for x in (payload.systolic_bp, payload.diastolic_bp, payload.bmi)
        ),
        "hypertension": payload.systolic_bp is not None and payload.diastolic_bp is not None,
        "anaemia": payload.haemoglobin is not None,
    }
    results = {}
    for disease, is_available in available.items():
        results[disease] = (
            {"status": "ready", "risk": None, "explanation": None}
            if is_available
            else {"status": "skipped", "reason": "Required data is missing"}
        )
    return {
        "patient_id": payload.patient_id,
        "results": results,
        "generated_at": datetime.utcnow().isoformat(),
    }
