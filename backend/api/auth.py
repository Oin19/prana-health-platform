import os
from dataclasses import dataclass

from fastapi import Header, HTTPException

from services.supabase_service import SupabaseService


@dataclass
class RequestUser:
    id: str | None
    access_token: str | None
    development_mode: bool


def get_request_user(authorization: str | None = Header(default=None)) -> RequestUser:
    configured = bool(os.getenv("SUPABASE_URL") and os.getenv("SUPABASE_ANON_KEY"))

    if not configured:
        return RequestUser(id=None, access_token=None, development_mode=True)

    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authentication is required.")

    token = authorization.removeprefix("Bearer ").strip()
    try:
        user = SupabaseService(token).current_user()
    except RuntimeError as exc:
        raise HTTPException(status_code=401, detail="Invalid or expired authentication session.") from exc

    if not user.get("id"):
        raise HTTPException(status_code=401, detail="Authenticated user could not be resolved.")

    return RequestUser(id=user["id"], access_token=token, development_mode=False)
