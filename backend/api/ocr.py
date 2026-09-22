from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from api.auth import RequestUser, get_request_user

router = APIRouter(prefix="/ocr", tags=["ocr"])


@router.post("/extract")
async def extract_report(
    patient_id: str = Form(...),
    file: UploadFile = File(...),
    user: RequestUser = Depends(get_request_user),
):
    if not user.access_token and not user.development_mode:
        raise HTTPException(status_code=401, detail="Authentication is required.")

    if not file.filename:
        raise HTTPException(status_code=400, detail="A medical report file is required.")

    allowed = {"application/pdf", "image/jpeg", "image/png", "image/webp"}
    if file.content_type not in allowed:
        raise HTTPException(status_code=400, detail="Only PDF, JPEG, PNG or WebP medical reports are supported.")

    # Keep the boundary explicit until the validated OCR provider is deployed.
    await file.read()
    return {
        "status": "not_configured",
        "patient_id": patient_id,
        "filename": file.filename,
        "extracted_data": None,
        "reason": "Medical-report OCR service is not connected.",
        "verification_required": True,
    }
