from fastapi import APIRouter, Depends, HTTPException

from api.auth import RequestUser, get_request_user
from services.supabase_service import SupabaseService

router = APIRouter(prefix="/users", tags=["users"])

ALLOWED_ROLES = {"asha_anm", "phc_staff", "phc_doctor", "admin"}


def require_admin(user: RequestUser) -> SupabaseService:
    if user.development_mode:
        raise HTTPException(status_code=503, detail="User management requires Supabase-backed authentication.")
    service = SupabaseService(user.access_token)
    profiles = service.select("user_profiles", query_params={"id": f"eq.{user.id}", "select": "role"})
    if not profiles or profiles[0].get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin role required.")
    return service


@router.get("")
def list_users(user: RequestUser = Depends(get_request_user)):
    service = require_admin(user)
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
    profiles = service.update(
        "user_profiles",
        f"id=eq.{user_id}",
        {"role": role},
    )
    if not profiles:
        raise HTTPException(status_code=404, detail="User profile not found.")
    return {"user": profiles[0]}
