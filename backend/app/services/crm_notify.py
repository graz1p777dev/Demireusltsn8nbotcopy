"""Fire-and-forget notifications into the CRM's notification bell.

Best-effort side channel: never raises, never blocks the pipeline. If
CRM_NOTIFY_TOKEN is unset the CRM route itself answers 503 and we just log it.
"""

import logging

import httpx

from app.core.config import settings

_log = logging.getLogger(__name__)


def notify(
    type: str,  # noqa: A002 — matches the CRM API field name
    title: str,
    body: str | None = None,
    is_important: bool = False,
    action_url: str | None = None,
    source_type: str | None = None,
    source_id: str | None = None,
) -> None:
    if not settings.crm_notify_token:
        return
    try:
        with httpx.Client(timeout=5) as client:
            client.post(
                settings.crm_notify_url,
                headers={"x-internal-token": settings.crm_notify_token},
                json={
                    "type": type,
                    "title": title,
                    "body": body,
                    "isImportant": is_important,
                    "actionUrl": action_url,
                    "sourceType": source_type,
                    "sourceId": source_id,
                },
            )
    except Exception:
        _log.exception("crm_notify.notify failed (type=%s)", type)
