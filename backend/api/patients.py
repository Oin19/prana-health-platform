from typing import Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from api.auth import RequestUser, get_request_user
from services.supabase_service import SupabaseService

router = APIRouter(prefix="/patients", tags=["patients"])

# Local-only fallback for development when Supabase is not configured.
_PATIENTS: dict[str, dict] = {}


class PatientCreate(BaseModel):
    name: str = Field(min_length=1)
    age: Optional[int] = Field(default=None, ge=0, le=130)
    gender: Optional[str] = None
    contact: Optional[str] = None
    address: Optional[str] = None


def _service(user: RequestUser) -> SupabaseService:
    if user.access_token:
        return SupabaseService(user.access_token)
    raise RuntimeError("Supabase service is not configured.")


@router.post("", status_code=201)
def register_patient(payload: PatientCreate, user: RequestUser = Depends(get_request_user)):
    if user.development_mode:
        patient_id = f"PRANA-{uuid4().hex[:8].upper()}"
        record = {"patient_id": patient_id, **payload.model_dump()}
        _PATIENTS[patient_id] = record
        return record

    try:
        record = _service(user).insert(
            "patients",
            {
                "patient_code": f"PRANA-{uuid4().hex[:10].upper()}",
                **payload.model_dump(),
                "created_by": user.id,
            },
        )
        return {**record, "patient_id": record["patient_code"]}
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail="Patient record could not be saved.") from exc


@router.get("")
def search_patients(query: Optional[str] = None, user: RequestUser = Depends(get_request_user)):
    if user.development_mode:
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

    try:
        service = _service(user)
        if query:
            escaped = query.replace(",", " ").replace("*", " ")
            filters = f"name.ilike.*{escaped}*,patient_code.ilike.*{escaped}*,address.ilike.*{escaped}*"
            rows = service.select("patients", f"select=*&or=({filters})&order=created_at.desc&limit=50")
        else:
            rows = service.select("patients", "select=*&order=created_at.desc&limit=50")
        return {"patients": [{**row, "patient_id": row["patient_code"]} for row in rows]}
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail="Patient records could not be retrieved.") from exc


@router.get("/{patient_id}")
def get_patient(patient_id: str, user: RequestUser = Depends(get_request_user)):
    if user.development_mode:
        patient = _PATIENTS.get(patient_id)
        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found")
        return patient

    try:
        rows = _service(user).select("patients", f"select=*&patient_code=eq.{patient_id}&limit=1")
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail="Patient record could not be retrieved.") from exc
    if not rows:
        raise HTTPException(status_code=404, detail="Patient not found")
    return {**rows[0], "patient_id": rows[0]["patient_code"]}
