from datetime import datetime, timezone
from typing import Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from api.auth import RequestUser, get_request_user
from services.supabase_service import SupabaseService

router = APIRouter(prefix="/referrals", tags=["referrals"])

_REFERRALS: list[dict] = []


class ReferralCreate(BaseModel):
    patient_id: str
    reason: str
    doctor_id: Optional[str] = None
    appointment_requested: bool = False
    screening_record_id: Optional[str] = None


@router.post("", status_code=201)
def create_referral(payload: ReferralCreate, user: RequestUser = Depends(get_request_user)):
    if user.development_mode:
        referral = {
            "referral_id": f"REF-{uuid4().hex[:8].upper()}",
            **payload.model_dump(),
            "status": "pending",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        _REFERRALS.append(referral)
        return referral

    try:
        service = SupabaseService(user.access_token)
        patient_rows = service.select("patients", f"select=id,patient_code&patient_code=eq.{payload.patient_id}&limit=1")
        if not patient_rows:
            raise HTTPException(status_code=404, detail="Patient not found.")
        row = service.insert(
            "referrals",
            {
                "patient_id": patient_rows[0]["id"],
                "screening_record_id": payload.screening_record_id,
                "reason": payload.reason,
                "doctor_id": payload.doctor_id,
                "created_by": user.id,
            },
        )
        return {**row, "referral_id": row["id"]}
    except HTTPException:
        raise
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail="Referral could not be created.") from exc


@router.get("")
def list_referrals(user: RequestUser = Depends(get_request_user)):
    if user.development_mode:
        return {"referrals": _REFERRALS}
    try:
        rows = SupabaseService(user.access_token).select(
            "referrals",
            "select=*&order=created_at.desc&limit=100",
        )
        return {"referrals": rows}
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail="Referrals could not be retrieved.") from exc
