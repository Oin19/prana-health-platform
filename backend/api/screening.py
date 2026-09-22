from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from api.auth import RequestUser, get_request_user
from services.supabase_service import SupabaseService
from services.risk_service import RiskAssessmentService

router = APIRouter(prefix="/screenings", tags=["screening"])


class HealthData(BaseModel):
    patient_id: str
    systolic_bp: Optional[float] = None
    diastolic_bp: Optional[float] = None
    blood_glucose: Optional[float] = None
    haemoglobin: Optional[float] = None
    bmi: Optional[float] = None
    symptoms: Optional[str] = None
    source: str = "manual"
    source_report_id: Optional[str] = None


def _assessment_results(payload: HealthData) -> dict:
    service = RiskAssessmentService()
    return service.assess(payload.model_dump())


def _patient_row(service: SupabaseService, patient_code: str) -> dict:
    rows = service.select("patients", f"select=id,patient_code&patient_code=eq.{patient_code}&limit=1")
    if not rows:
        raise HTTPException(status_code=404, detail="Patient not found.")
    return rows[0]


@router.post("/health-data")
def save_health_data(payload: HealthData, user: RequestUser = Depends(get_request_user)):
    if user.development_mode:
        return {
            "status": "accepted",
            "patient_id": payload.patient_id,
            "health_data": payload.model_dump(),
            "recorded_at": datetime.now(timezone.utc).isoformat(),
        }

    try:
        service = SupabaseService(user.access_token)
        patient = _patient_row(service, payload.patient_id)
        row = service.insert(
            "health_data",
            {
                "patient_id": patient["id"],
                "systolic_bp": payload.systolic_bp,
                "diastolic_bp": payload.diastolic_bp,
                "blood_glucose": payload.blood_glucose,
                "haemoglobin": payload.haemoglobin,
                "bmi": payload.bmi,
                "symptoms": payload.symptoms,
                "source": payload.source,
                "source_report_id": payload.source_report_id,
                "recorded_by": user.id,
            },
        )
        return {"status": "accepted", "patient_id": payload.patient_id, "health_data": row}
    except HTTPException:
        raise
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail="Health data could not be saved.") from exc


@router.post("/assess")
def assess_screening(payload: HealthData, user: RequestUser = Depends(get_request_user)):
    results = _assessment_results(payload)

    if user.development_mode:
        return {
            "patient_id": payload.patient_id,
            "results": results,
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }

    try:
        service = SupabaseService(user.access_token)
        patient = _patient_row(service, payload.patient_id)
        health_rows = service.select(
            "health_data",
            f"select=id&patient_id=eq.{patient['id']}&order=recorded_at.desc&limit=1",
        )
        health_data_id = health_rows[0]["id"] if health_rows else None
        referral_required = any(result.get("referral_required") is True for result in results.values())
        row = service.insert(
            "screening_records",
            {
                "patient_id": patient["id"],
                "health_data_id": health_data_id,
                "diabetes": results["diabetes"],
                "cardiovascular": results["cardiovascular"],
                "hypertension": results["hypertension"],
                "anaemia": results["anaemia"],
                "referral_required": referral_required,
                "referral_guidance": None,
                "created_by": user.id,
            },
        )
        return {
            "patient_id": payload.patient_id,
            "screening_record_id": row["id"],
            "results": results,
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail="Screening record could not be saved.") from exc


@router.get("/history/{patient_id}")
def screening_history(patient_id: str, user: RequestUser = Depends(get_request_user)):
    if user.development_mode:
        return {"patient_id": patient_id, "health_data": [], "screenings": []}

    try:
        service = SupabaseService(user.access_token)
        patient = _patient_row(service, patient_id)
        health_data = service.select(
            "health_data",
            f"select=*&patient_id=eq.{patient['id']}&order=recorded_at.desc&limit=100",
        )
        screenings = service.select(
            "screening_records",
            f"select=*&patient_id=eq.{patient['id']}&order=created_at.desc&limit=100",
        )
        return {
            "patient_id": patient_id,
            "health_data": health_data,
            "screenings": screenings,
        }
    except HTTPException:
        raise
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail="Patient history could not be retrieved.") from exc
