import os
from typing import Any

import httpx


class SupabaseService:
    """Small REST client that forwards the signed-in user's token so Supabase RLS applies."""

    def __init__(self, access_token: str):
        self.url = os.getenv("SUPABASE_URL", "").rstrip("/")
        self.anon_key = os.getenv("SUPABASE_ANON_KEY", "")
        self.access_token = access_token

    @property
    def configured(self) -> bool:
        return bool(self.url and self.anon_key and self.access_token)

    def _headers(self) -> dict[str, str]:
        return {
            "apikey": self.anon_key,
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json",
        }

    def request(self, method: str, path: str, **kwargs: Any) -> Any:
        with httpx.Client(timeout=20) as client:
            response = client.request(method, f"{self.url}{path}", headers=self._headers(), **kwargs)
        if response.status_code >= 400:
            detail = response.text[:500]
            raise RuntimeError(f"Supabase request failed ({response.status_code}): {detail}")
        if not response.content:
            return None
        return response.json()

    def select(self, table: str, query: str) -> list[dict[str, Any]]:
        return self.request("GET", f"/rest/v1/{table}?{query}")

    def insert(self, table: str, row: dict[str, Any]) -> dict[str, Any]:
        result = self.request(
            "POST",
            f"/rest/v1/{table}",
            params={"select": "*"},
            json=row,
            headers={**self._headers(), "Prefer": "return=representation"},
        )
        return result[0] if isinstance(result, list) else result

    def update(self, table: str, query: str, row: dict[str, Any]) -> list[dict[str, Any]]:
        return self.request(
            "PATCH",
            f"/rest/v1/{table}?{query}",
            params={"select": "*"},
            json=row,
            headers={**self._headers(), "Prefer": "return=representation"},
        )

    def current_user(self) -> dict[str, Any]:
        return self.request("GET", "/auth/v1/user")


def supabase_enabled() -> bool:
    return bool(os.getenv("SUPABASE_URL") and os.getenv("SUPABASE_ANON_KEY"))
