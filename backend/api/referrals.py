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


class ReferralUpdate(BaseModel):
    status: Optional[str] = None
    consultation_advice: Optional[str] = None


@router.patch("/{referral_id}")
def update_referral(
    referral_id: str,
    payload: ReferralUpdate,
    user: RequestUser = Depends(get_request_user),
):
    if user.development_mode:
        for referral in _REFERRALS:
            if referral["referral_id"] == referral_id:
                if payload.status is not None:
                    referral["status"] = payload.status
                if payload.consultation_advice is not None:
                    referral["consultation_advice"] = payload.consultation_advice
                return referral
        raise HTTPException(status_code=404, detail="Referral not found.")

    if payload.status is None and payload.consultation_advice is None:
        raise HTTPException(status_code=400, detail="At least one consultation field is required.")

    if payload.status is not None and payload.status not in {"pending", "reviewed", "completed"}:
        raise HTTPException(status_code=400, detail="Invalid referral status.")

    if not user.id:
        raise HTTPException(status_code=401, detail="Authentication is required.")

    try:
        service = SupabaseService(user.access_token)
        profile = service.select(
            "user_profiles",
            f"select=role&id=eq.{user.id}&limit=1",
        )
        if not profile or profile[0]["role"] != "phc_doctor":
            raise HTTPException(status_code=403, detail="Only PHC doctors can update consultation records.")

        update_data = {}
        if payload.status is not None:
            update_data["status"] = payload.status
        if payload.consultation_advice is not None:
            update_data["consultation_advice"] = payload.consultation_advice

        rows = service.update(
            "referrals",
            f"id=eq.{referral_id}",
            update_data,
        )
        if not rows:
            raise HTTPException(status_code=404, detail="Referral not found.")
        return rows[0]
    except HTTPException:
        raise
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail="Referral could not be updated.") from exc
