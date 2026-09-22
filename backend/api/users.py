from typing import Optional

from fastapi import APIRouter, Depends, HTTPException

from api.auth import RequestUser, get_request_user
from services.supabase_service import SupabaseService

router = APIRouter(prefix="/users", tags=["users"])

ALLOWED_ROLES = {"asha_anm", "phc_staff", "phc_doctor", "admin"}

_LOCAL_USERS = [
    {"id": "dev-user-1", "full_name": "PRANA Demo Worker", "role": "asha_anm", "created_at": "2026-01-01T00:00:00+00:00"},
    {"id": "dev-user-2", "full_name": "PRANA Demo PHC Staff", "role": "phc_staff", "created_at": "2026-01-02T00:00:00+00:00"},
    {"id": "dev-user-3", "full_name": "PRANA Demo Doctor", "role": "phc_doctor", "created_at": "2026-01-03T00:00:00+00:00"},
    {"id": "dev-user-4", "full_name": "PRANA Demo Admin", "role": "admin", "created_at": "2026-01-04T00:00:00+00:00"},
]


def require_admin(user: RequestUser) -> Optional[SupabaseService]:
    if user.development_mode:
        return None
    service = SupabaseService(user.access_token)
    profiles = service.select("user_profiles", f"select=role&id=eq.{user.id}&limit=1")
    if not profiles or profiles[0].get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin role required.")
    return service


@router.get("")
def list_users(user: RequestUser = Depends(get_request_user)):
    service = require_admin(user)
    if service is None:
        return {"users": [dict(profile) for profile in _LOCAL_USERS]}
    profiles = service.select(
        "user_profiles",
        query_params={
            "select": "id,full_name,role,created_at",
            "order": "created_at.desc",
        },
    )
    return {"users": profiles}


@router.patch("/{user_id}")
def update_user_role(
    user_id: str,
    role: str,
    user: RequestUser = Depends(get_request_user),
):
    if role not in ALLOWED_ROLES:
        raise HTTPException(status_code=400, detail="Invalid PRANA role.")
    service = require_admin(user)
    if service is None:
        target = next((profile for profile in _LOCAL_USERS if profile["id"] == user_id), None)
        if not target:
            raise HTTPException(status_code=404, detail="User profile not found.")
        if target["role"] == "admin" and role != "admin":
            raise HTTPException(status_code=400, detail="The demo admin cannot remove its admin role.")
        target["role"] = role
        return {"user": dict(target)}
    if user_id == user.id and role != "admin":
        raise HTTPException(status_code=400, detail="An admin cannot remove their own admin role.")

    profiles = service.update(
        "user_profiles",
        f"id=eq.{user_id}",
        {"role": role},
    )
    if not profiles:
        raise HTTPException(status_code=404, detail="User profile not found.")
    return {"user": profiles[0]}
