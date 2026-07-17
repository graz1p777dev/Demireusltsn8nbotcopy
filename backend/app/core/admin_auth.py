from collections.abc import Awaitable, Callable

from fastapi import Request, Response
from starlette.responses import JSONResponse

from app.core.config import settings


async def admin_auth_middleware(
    request: Request,
    call_next: Callable[[Request], Awaitable[Response]],
) -> Response:
    gated = request.url.path.startswith("/admin/") or request.url.path.startswith("/copilot/")
    if not gated or not settings.admin_api_key:
        return await call_next(request)
    if request.headers.get("X-Admin-API-Key") != settings.admin_api_key:
        return JSONResponse({"detail": "admin api key required"}, status_code=401)
    return await call_next(request)

