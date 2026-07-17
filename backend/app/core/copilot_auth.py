from dataclasses import dataclass

from fastapi import HTTPException, Request


@dataclass(frozen=True)
class CurrentUser:
    username: str
    is_admin: bool


def get_current_user(request: Request) -> CurrentUser:
    """Identity for Copilot requests, forwarded by the Next.js proxy (which
    decodes the crm_token cookie server-side) via X-User-Name / X-User-Is-Admin.
    Not used by any other router — the rest of the backend has no per-user auth.
    """
    username = request.headers.get("X-User-Name")
    if not username:
        raise HTTPException(status_code=401, detail="Not authenticated")
    is_admin = request.headers.get("X-User-Is-Admin") == "true"
    return CurrentUser(username=username, is_admin=is_admin)
