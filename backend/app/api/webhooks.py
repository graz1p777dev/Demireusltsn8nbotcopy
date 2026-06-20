from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.models.entities import ApprovalRequest, Lead
from app.schemas.amocrm import parse_amocrm_webhook
from app.services import telegram
from app.services.repository import upsert_incoming
from app.tasks.pipeline import (
    apply_ai_edited_reply,
    apply_edited_reply,
    approve_request,
    pop_ai_edit_session,
    pop_edit_session,
    process_lead_buffer,
    reject_request,
    save_request,
    set_ai_edit_session,
    set_edit_session,
)

router = APIRouter(prefix="/webhooks", tags=["webhooks"])


@router.post("/amocrm")
@router.post("/amocrm/{secret}")
async def amocrm_webhook(
    request: Request,
    secret: str | None = None,
    db: Session = Depends(get_db),
) -> dict:
    if settings.amocrm_webhook_secret:
        header_secret = request.headers.get("x-webhook-secret", "")
        if secret != settings.amocrm_webhook_secret and header_secret != settings.amocrm_webhook_secret:
            raise HTTPException(status_code=401, detail="invalid amocrm webhook secret")
    form = await request.form()
    body = dict(form)
    if not body:
        body = await request.json()
    incoming = parse_amocrm_webhook(body)
    lead, _conversation, is_new = upsert_incoming(db, incoming)
    if is_new and lead.ai_enabled:
        process_lead_buffer.apply_async(
            args=[lead.id, incoming.message_id],
            countdown=settings.message_buffer_seconds,
        )
    return {"ok": True, "queued": is_new, "lead_id": lead.amocrm_lead_id, "message_id": incoming.message_id}


@router.post("/telegram/{secret}")
async def telegram_webhook(secret: str, request: Request, db: Session = Depends(get_db)) -> dict:
    if settings.telegram_webhook_secret and secret != settings.telegram_webhook_secret:
        raise HTTPException(status_code=401, detail="invalid telegram webhook secret")
    update = await request.json()

    if callback := update.get("callback_query"):
        callback_id = callback["id"]
        manager_id = str(callback["from"]["id"])
        callback_chat_id = str(callback.get("message", {}).get("chat", {}).get("id", ""))
        if not telegram.is_authorized_manager(manager_id, callback_chat_id):
            telegram.answer_callback(callback_id, "Нет доступа")
            return {"ok": False, "error": "unauthorized_manager"}
        data = callback.get("data", "")
        if ":" not in data:
            telegram.answer_callback(callback_id, "Некорректная кнопка")
            return {"ok": False, "error": "invalid_callback"}
        action, raw_id = data.split(":", 1)
        approval_id = int(raw_id)
        approval = db.get(ApprovalRequest, approval_id)
        lead = db.get(Lead, approval.lead_id) if approval else None

        if action == "approve":
            ok = approve_request(db, approval_id, manager_id)
            telegram.answer_callback(callback_id, "Отправлено" if ok else "Не удалось отправить")
            return {"ok": ok, "action": action}
        if action == "reject":
            ok = reject_request(db, approval_id, manager_id)
            telegram.answer_callback(callback_id, "Отклонено")
            return {"ok": ok, "action": action}
        if action == "save":
            ok = save_request(db, approval_id, manager_id)
            telegram.answer_callback(callback_id, "Сохранено в /no-sorted")
            return {"ok": ok, "action": action}
        if action == "edit":
            set_edit_session(db, manager_id, approval_id)
            telegram.answer_callback(callback_id)
            telegram.send_text(manager_id, "✏️ Отправьте новый текст ответа.")
            return {"ok": True, "action": action}
        if action == "ai_edit":
            set_ai_edit_session(db, manager_id, approval_id)
            telegram.answer_callback(callback_id)
            telegram.send_text(manager_id, "🤖 Напишите промпт — как изменить ответ?\n\nНапример: «сделай короче», «добавь про акцию», «переведи на кыргызский»")
            return {"ok": True, "action": action}
        if action == "memory":
            telegram.answer_callback(callback_id)
            if approval:
                telegram.send_text(manager_id, telegram.memory_lines(approval.extracted_fields))
            return {"ok": True, "action": action}
        if lead:
            telegram.answer_callback(callback_id, telegram.lead_url(lead))
        return {"ok": True, "action": action}

    if message := update.get("message"):
        manager_id = str(message.get("from", {}).get("id", ""))
        message_chat_id = str(message.get("chat", {}).get("id", ""))
        text = message.get("text", "").strip()
        if not telegram.is_authorized_manager(manager_id, message_chat_id):
            return {"ok": False, "error": "unauthorized_manager"}
        if text in {"/no-sorted", "/nosorted", "/unsorted"}:
            approvals = db.scalars(
                select(ApprovalRequest)
                .where(ApprovalRequest.status == "saved")
                .order_by(desc(ApprovalRequest.created_at))
                .limit(10)
            ).all()
            if not approvals:
                telegram.send_text(manager_id, "Сохраненных неразобранных ответов нет.")
                return {"ok": True, "action": "no_sorted"}
            lines = ["Неразобранные ответы:"]
            for item in approvals:
                lead = db.get(Lead, item.lead_id)
                lead_label = lead.amocrm_lead_id if lead else str(item.lead_id)
                lines.append(
                    f"#{item.id} | Lead {lead_label} | {item.amocrm_stage_name or item.amocrm_status_id or '-'}\n"
                    f"Клиент: {item.client_message[:120]}\n"
                    f"AI: {(item.edited_reply or item.ai_reply)[:180]}"
                )
            telegram.send_text(manager_id, "\n\n".join(lines))
            return {"ok": True, "action": "no_sorted"}
        # Ручное редактирование
        edit_approval_id = pop_edit_session(db, manager_id)
        if edit_approval_id and text:
            approval = apply_edited_reply(db, edit_approval_id, manager_id, text)
            lead = db.get(Lead, approval.lead_id) if approval else None
            if approval and lead:
                telegram.edit_approval_card(approval, lead)
            return {"ok": True, "action": "edited"}

        # AI-редактор
        ai_edit_approval_id = pop_ai_edit_session(db, manager_id)
        if ai_edit_approval_id and text:
            approval = apply_ai_edited_reply(db, ai_edit_approval_id, manager_id, text)
            lead = db.get(Lead, approval.lead_id) if approval else None
            if approval and lead:
                telegram.edit_approval_card(approval, lead)
            return {"ok": True, "action": "ai_edited"}
    return {"ok": True}
