from datetime import datetime
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

router = APIRouter(prefix="/patients", tags=["patients"])

# Temporary development store. Replace with Supabase repository/service in deployment.
_PATIENTS: dict[str, dict] = {}


class PatientCreate(BaseModel):
    name: str = Field(min_length=1)
    age: Optional[int] = Field(default=None, ge=0, le=130)
    gender: Optional[str] = None
    contact: Optional[str] = None
    address: Optional[str] = None


@router.post("", status_code=201)
def register_patient(payload: PatientCreate):
    patient_id = f"PRANA-{len(_PATIENTS) + 1:06d}"
    record = {
        "patient_id": patient_id,
        **payload.model_dump(),
        "created_at": datetime.utcnow().isoformat(),
    }
    _PATIENTS[patient_id] = record
    return record


@router.get("")
def search_patients(query: Optional[str] = None):
    records = list(_PATIENTS.values())
    if query:
        q = query.lower()
        records = [
            p for p in records
            if q in p["patient_id"].lower()
            or q in p["name"].lower()
            or q in (p.get("address") or "").lower()
        ]
    return {"patients": records}


@router.get("/{patient_id}")
def get_patient(patient_id: str):
    patient = _PATIENTS.get(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient
