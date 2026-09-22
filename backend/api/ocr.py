import os
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel, ConfigDict, Field

from api.auth import RequestUser, get_request_user
from services.supabase_service import SupabaseService

router = APIRouter(prefix="/ocr", tags=["ocr"])

_ALLOWED_TYPES = {"application/pdf", "image/jpeg", "image/png", "image/webp"}
_MAX_REPORT_BYTES = 10 * 1024 * 1024


class VerifiedReportData(BaseModel):
    model_config = ConfigDict(extra="forbid")

    systolic_bp: float | None = Field(default=None, allow_inf_nan=False)
    diastolic_bp: float | None = Field(default=None, allow_inf_nan=False)
    blood_glucose: float | None = Field(default=None, allow_inf_nan=False)
    haemoglobin: float | None = Field(default=None, allow_inf_nan=False)
    bmi: float | None = Field(default=None, allow_inf_nan=False)
    symptoms: str | None = None

    def supported_values(self) -> dict:
        return self.model_dump(exclude_none=True)





@router.get("/reports/{patient_id}")
def list_reports(
    patient_id: str,
    user: RequestUser = Depends(get_request_user),
):
    if user.development_mode:
        return {"patient_id": patient_id, "reports": []}

    try:
        service = SupabaseService(user.access_token)
        patient_rows = service.select(
            "patients",
            f"select=id,patient_code&patient_code=eq.{patient_id}&limit=1",
        )
        if not patient_rows:
            raise HTTPException(status_code=404, detail="Patient not found.")

        reports = service.select(
            "medical_reports",
            f"select=id,patient_id,storage_path,ocr_status,extracted_data,verified_data,verified_by,created_at&patient_id=eq.{patient_rows[0]['id']}&order=created_at.desc&limit=100",
        )
        return {"patient_id": patient_id, "reports": reports}
    except HTTPException:
        raise
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail="Medical-report history could not be retrieved.") from exc


@router.patch("/reports/{report_id}/verify")
async def verify_report(
    report_id: str,
    verified_data: VerifiedReportData,
    user: RequestUser = Depends(get_request_user),
):
    if user.development_mode:
        raise HTTPException(
            status_code=503,
            detail="Medical-report verification requires Supabase-backed authentication.",
        )

    if not verified_data.supported_values():
        raise HTTPException(status_code=400, detail="At least one supported verified health value is required.")

    try:
        service = SupabaseService(user.access_token)
        reports = service.select(
            "medical_reports",
            f"select=id,extracted_data& id=eq.{report_id}&limit=1".replace(" ", ""),
        )
        if not reports:
            raise HTTPException(status_code=404, detail="Medical report not found.")
        if not reports[0].get("extracted_data"):
            raise HTTPException(
                status_code=409,
                detail="The report has no OCR-extracted data to verify yet.",
            )

        rows = service.update(
            "medical_reports",
            f"id=eq.{report_id}",
            {
                "verified_data": verified_data.supported_values(),
                "verified_by": user.id,
                "ocr_status": "extracted",
            },
        )
        if not rows:
            raise HTTPException(status_code=404, detail="Medical report not found.")
        return {
            "status": "verified",
            "report_id": report_id,
            "verified_data": rows[0].get("verified_data"),
        }
    except HTTPException:
        raise
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail="Medical-report verification could not be saved.") from exc


@router.post("/reports/{report_id}/apply-to-health-data")
def apply_verified_report_to_health_data(
    report_id: str,
    user: RequestUser = Depends(get_request_user),
):
    if user.development_mode:
        raise HTTPException(
            status_code=503,
            detail="Applying verified report data requires Supabase-backed authentication.",
        )

    try:
        service = SupabaseService(user.access_token)
        reports = service.select(
            "medical_reports",
            f"select=id,patient_id,verified_data& id=eq.{report_id}&limit=1".replace(" ", ""),
        )
        if not reports:
            raise HTTPException(status_code=404, detail="Medical report not found.")

        verified = reports[0].get("verified_data") or {}
        if not isinstance(verified, dict) or not verified:
            raise HTTPException(
                status_code=409,
                detail="Verify the extracted report values before applying them to health data.",
            )

        allowed_fields = (
            "systolic_bp",
            "diastolic_bp",
            "blood_glucose",
            "haemoglobin",
            "bmi",
            "symptoms",
        )
        try:
            validated = VerifiedReportData.model_validate(verified)
        except Exception as exc:
            raise HTTPException(status_code=422, detail="Stored verified report data is invalid.") from exc
        health_values = validated.supported_values()
        if not health_values:
            raise HTTPException(
                status_code=422,
                detail="The verified report contains no supported PRANA health-data fields.",
            )

        existing = service.select(
            "health_data",
            f"select=*&source_report_id=eq.{report_id}&limit=1",
        )
        if existing:
            return {
                "status": "already_applied",
                "report_id": report_id,
                "health_data": existing[0],
            }

        row = service.insert(
            "health_data",
            {
                "patient_id": reports[0]["patient_id"],
                **health_values,
                "source": "ocr_verified",
                "source_report_id": report_id,
                "recorded_by": user.id,
            },
        )
        return {
            "status": "applied",
            "report_id": report_id,
            "health_data": row,
        }
    except HTTPException:
        raise
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail="Verified report data could not be applied.") from exc


@router.post("/extract")
async def extract_report(
    patient_id: str = Form(...),
    file: UploadFile = File(...),
    user: RequestUser = Depends(get_request_user),
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="A medical report file is required.")

    if file.content_type not in _ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="Only PDF, JPEG, PNG or WebP medical reports are supported.")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="The medical report file is empty.")
    if len(content) > _MAX_REPORT_BYTES:
        raise HTTPException(status_code=413, detail="Medical report files must be 10 MB or smaller.")

    if user.development_mode:
        return {
            "status": "not_configured",
            "patient_id": patient_id,
            "filename": file.filename,
            "report_id": None,
            "extracted_data": None,
            "reason": "Supabase storage and the medical-report OCR service are not configured in local development mode.",
            "verification_required": True,
        }

    try:
        service = SupabaseService(user.access_token)
        patient_rows = service.select(
            "patients",
            f"select=id,patient_code&patient_code=eq.{patient_id}&limit=1",
        )
        if not patient_rows:
            raise HTTPException(status_code=404, detail="Patient not found.")

        bucket = os.getenv("SUPABASE_MEDICAL_REPORTS_BUCKET", "").strip()
        if not bucket:
            raise HTTPException(
                status_code=503,
                detail="Medical-report storage bucket is not configured.",
            )

        storage_path = f"{patient_rows[0]['id']}/{uuid4().hex}-{file.filename}"
        service.upload_file(bucket, storage_path, content, file.content_type)

        report = service.insert(
            "medical_reports",
            {
                "patient_id": patient_rows[0]["id"],
                "storage_path": storage_path,
                "ocr_status": "pending",
                "extracted_data": None,
                "verified_data": None,
                "created_by": user.id,
            },
        )

        return {
            "status": "not_configured",
            "patient_id": patient_id,
            "filename": file.filename,
            "report_id": report["id"],
            "storage_path": storage_path,
            "extracted_data": None,
            "reason": "Medical-report OCR service is not connected.",
            "verification_required": True,
        }
    except HTTPException:
        raise
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail="Medical report could not be stored.") from exc
