import os
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from api.auth import RequestUser, get_request_user
from services.supabase_service import SupabaseService

router = APIRouter(prefix="/ocr", tags=["ocr"])

_ALLOWED_TYPES = {"application/pdf", "image/jpeg", "image/png", "image/webp"}


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
