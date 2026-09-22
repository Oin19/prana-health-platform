import os
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from api.auth import RequestUser, get_request_user
from services.supabase_service import SupabaseService

router = APIRouter(prefix="/ocr", tags=["ocr"])

_ALLOWED_TYPES = {"application/pdf", "image/jpeg", "image/png", "image/webp"}



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
    verified_data: dict,
    user: RequestUser = Depends(get_request_user),
):
    if user.development_mode:
        raise HTTPException(
            status_code=503,
            detail="Medical-report verification requires Supabase-backed authentication.",
        )

    if not verified_data:
        raise HTTPException(status_code=400, detail="Verified report data is required.")

    try:
        service = SupabaseService(user.access_token)
        rows = service.update(
            "medical_reports",
            f"id=eq.{report_id}",
            {
                "verified_data": verified_data,
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
