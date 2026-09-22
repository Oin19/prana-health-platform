from datetime import datetime
from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/referrals", tags=["referrals"])

_REFERRALS: list[dict] = []


class ReferralCreate(BaseModel):
    patient_id: str
    reason: str
    doctor_id: Optional[str] = None
    appointment_requested: bool = False


@router.post("", status_code=201)
def create_referral(payload: ReferralCreate):
    referral = {
        "referral_id": f"REF-{len(_REFERRALS) + 1:06d}",
        **payload.model_dump(),
        "status": "pending",
        "created_at": datetime.utcnow().isoformat(),
    }
    _REFERRALS.append(referral)
    return referral


@router.get("")
def list_referrals():
    return {"referrals": _REFERRALS}
