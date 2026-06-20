from html import escape

import httpx

from app.core.config import settings
from app.models.entities import ApprovalRequest, Lead


def telegram_enabled() -> bool:
    return bool(settings.telegram_bot_token and settings.telegram_manager_chat_id)


def allowed_manager_ids() -> set[str]:
    return {
        item.strip()
        for item in settings.telegram_allowed_manager_ids.split(",")
        if item.strip()
    }


def is_authorized_manager(manager_id: str, chat_id: str | None = None) -> bool:
    allowed_ids = allowed_manager_ids()
    if allowed_ids:
        return manager_id in allowed_ids
    if chat_id and str(chat_id) == str(settings.telegram_manager_chat_id):
        return str(settings.telegram_manager_chat_id) == manager_id
    return str(settings.telegram_manager_chat_id) == manager_id


def _api_url(method: str) -> str:
    return f"https://api.telegram.org/bot{settings.telegram_bot_token}/{method}"


def lead_url(lead: Lead) -> str:
    return f"{settings.amocrm_base_url.rstrip('/')}/leads/detail/{lead.amocrm_lead_id}"


def memory_lines(extracted: dict | None) -> str:
    if not extracted:
        return "- Пока нет извлеченной памяти"
    skin_problem = ", ".join(extracted.get("skin_problem") or []) or "не указано"
    return "\n".join(
        [
            f"- Проблема: {escape(skin_problem)}",
            f"- Город: {escape(str(extracted.get('city') or 'не указан'))}",
            f"- Опыт: {escape(str(extracted.get('experience') or 'не указан'))}",
            f"- Была консультация: {'да' if extracted.get('consultation_confirmed') else 'нет'}",
        ]
    )


def approval_card(approval: ApprovalRequest, lead: Lead) -> str:
    client_name = lead.client.name if lead.client else "Без имени"
    contact = lead.client.phone if lead.client and lead.client.phone else lead.contact_id or "-"
    score = 78
    reply = approval.edited_reply or approval.ai_reply
    return (
        "🟣 <b>Новый AI-ответ</b>\n\n"
        f"👤 <b>Клиент:</b> {escape(client_name or 'Без имени')}\n"
        f"📞 <b>Контакт:</b> {escape(str(contact))}\n"
        f"🧾 <b>Lead ID:</b> {escape(lead.amocrm_lead_id)}\n"
        f"📍 <b>Этап amoCRM:</b> {escape(approval.amocrm_stage_name or str(approval.amocrm_status_id or 'неизвестно'))}\n"
        f"🔥 <b>Score:</b> {score}%\n\n"
        f"💬 <b>Сообщение клиента:</b>\n“{escape(approval.client_message)}”\n\n"
        f"🤖 <b>Ответ бота:</b>\n{escape(reply)}\n\n"
        f"🧠 <b>Память:</b>\n{memory_lines(approval.extracted_fields)}\n\n"
        "⚙️ <b>Действия после принятия:</b>\n"
        "- отправить ответ в amoCRM\n"
        "- сохранить ответ в историю\n"
        "- обновить поля сделки\n"
        "- сохранить исправление менеджера для улучшения бота"
    )


def approval_keyboard(approval_id: int, lead: Lead) -> dict:
    return {
        "inline_keyboard": [
            [
                {"text": "✅ Принять", "callback_data": f"approve:{approval_id}"},
                {"text": "❌ Отклонить", "callback_data": f"reject:{approval_id}"},
            ],
            [
                {"text": "✏️ Изменить вручную", "callback_data": f"edit:{approval_id}"},
                {"text": "🤖 AI-редактор", "callback_data": f"ai_edit:{approval_id}"},
            ],
            [
                {"text": "💾 Сохранить", "callback_data": f"save:{approval_id}"},
                {"text": "🧠 Память", "callback_data": f"memory:{approval_id}"},
            ],
            [
                {"text": "📋 Открыть лид", "url": lead_url(lead)},
            ],
        ]
    }


def send_approval_card(approval: ApprovalRequest, lead: Lead) -> dict:
    if not telegram_enabled():
        return {"skipped": True, "reason": "telegram not configured"}
    with httpx.Client(timeout=20) as client:
        response = client.post(
            _api_url("sendMessage"),
            json={
                "chat_id": settings.telegram_manager_chat_id,
                "text": approval_card(approval, lead),
                "parse_mode": "HTML",
                "reply_markup": approval_keyboard(approval.id, lead),
                "disable_web_page_preview": True,
            },
        )
        response.raise_for_status()
        return response.json()


def edit_approval_card(approval: ApprovalRequest, lead: Lead) -> dict:
    if not telegram_enabled() or not approval.telegram_message_id:
        return {"skipped": True}
    with httpx.Client(timeout=20) as client:
        response = client.post(
            _api_url("editMessageText"),
            json={
                "chat_id": settings.telegram_manager_chat_id,
                "message_id": approval.telegram_message_id,
                "text": approval_card(approval, lead),
                "parse_mode": "HTML",
                "reply_markup": approval_keyboard(approval.id, lead),
                "disable_web_page_preview": True,
            },
        )
        response.raise_for_status()
        return response.json()


def send_text(chat_id: str | int, text: str) -> dict:
    if not settings.telegram_bot_token:
        return {"skipped": True}
    with httpx.Client(timeout=20) as client:
        response = client.post(_api_url("sendMessage"), json={"chat_id": chat_id, "text": text})
        response.raise_for_status()
        return response.json()


def answer_callback(callback_query_id: str, text: str = "") -> None:
    if not settings.telegram_bot_token:
        return
    with httpx.Client(timeout=10) as client:
        client.post(_api_url("answerCallbackQuery"), json={"callback_query_id": callback_query_id, "text": text})
