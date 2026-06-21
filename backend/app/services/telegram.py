from datetime import datetime
from html import escape
from zoneinfo import ZoneInfo

import httpx

from app.core.config import settings
from app.models.entities import ApprovalRequest, Lead


def calc_score(extracted: dict | None, messages_count: int = 1) -> int:
    score = 10
    if not extracted:
        return score
    if extracted.get("skin_problem"):
        score += 20
    if extracted.get("city"):
        score += 15
    if extracted.get("experience"):
        score += 10
    if extracted.get("consultation_confirmed"):
        score += 30
    elif extracted.get("consultation_date"):
        score += 15
    if messages_count >= 5:
        score += 10
    elif messages_count >= 3:
        score += 5
    return min(score, 99)


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


def approval_card(approval: ApprovalRequest, lead: Lead, decision: str | None = None, messages_count: int = 1) -> str:
    client_name = lead.client.name if lead.client else “Без имени”
    contact = lead.client.phone if lead.client and lead.client.phone else lead.contact_id or “-”
    score = calc_score(approval.extracted_fields, messages_count)
    reply = approval.edited_reply or approval.ai_reply
    text = (
        “🟣 <b>Новый AI-ответ</b>\n\n”
        f”👤 <b>Клиент:</b> {escape(client_name or 'Без имени')}\n”
        f”📞 <b>Контакт:</b> {escape(str(contact))}\n”
        f”🧾 <b>Lead ID:</b> {escape(lead.amocrm_lead_id)}\n”
        f”📍 <b>Этап amoCRM:</b> {escape(approval.amocrm_stage_name or str(approval.amocrm_status_id or 'неизвестно'))}\n”
        f”🔥 <b>Score:</b> {score}%\n\n”
        f”💬 <b>Сообщение клиента:</b>\n”{escape(approval.client_message)}”\n\n”
        f”🤖 <b>Ответ бота:</b>\n{escape(reply)}\n\n”
        f”🧠 <b>Память:</b>\n{memory_lines(approval.extracted_fields)}\n\n”
        “⚙️ <b>Действия после принятия:</b>\n”
        “- отправить ответ в amoCRM\n”
        “- сохранить ответ в историю\n”
        “- обновить поля сделки\n”
        “- сохранить исправление менеджера для улучшения бота”
    )
    if decision:
        now = datetime.now(ZoneInfo(settings.timezone)).strftime(“%d.%m.%Y %H:%M”)
        text += f”\n\n━━━━━━━━━━━━━━━━━━━━\n{decision} · {now}”
    return text


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
                {"text": "📂 Переместить на этап", "callback_data": f"move_stage:{approval_id}"},
            ],
            [
                {"text": "📋 Открыть лид", "url": lead_url(lead)},
            ],
        ]
    }


def stages_keyboard(stages: list[dict], approval_id: int) -> dict:
    rows = []
    for stage in stages:
        stage_id = stage.get("id")
        stage_name = stage.get("name", "")
        if stage_id and stage_name:
            rows.append([{
                "text": stage_name,
                "callback_data": f"set_stage:{approval_id}:{stage_id}",
            }])
    rows.append([{"text": "✖ Отмена", "callback_data": f"cancel_stage:{approval_id}"}])
    return {"inline_keyboard": rows}


def send_stages_menu(chat_id: str | int, stages: list[dict], approval_id: int) -> dict:
    if not settings.telegram_bot_token:
        return {"skipped": True}
    with httpx.Client(timeout=20) as client:
        response = client.post(
            _api_url("sendMessage"),
            json={
                "chat_id": chat_id,
                "text": "📂 <b>Выберите этап для перемещения лида:</b>",
                "parse_mode": "HTML",
                "reply_markup": stages_keyboard(stages, approval_id),
            },
        )
        response.raise_for_status()
        return response.json()


def delete_message(chat_id: str | int, message_id: int) -> None:
    if not settings.telegram_bot_token:
        return
    with httpx.Client(timeout=10) as client:
        client.post(_api_url("deleteMessage"), json={"chat_id": chat_id, "message_id": message_id})


def send_approval_card(approval: ApprovalRequest, lead: Lead, messages_count: int = 1) -> dict:
    if not telegram_enabled():
        return {"skipped": True, "reason": "telegram not configured"}
    with httpx.Client(timeout=20) as client:
        response = client.post(
            _api_url("sendMessage"),
            json={
                "chat_id": settings.telegram_manager_chat_id,
                "text": approval_card(approval, lead, messages_count=messages_count),
                "parse_mode": "HTML",
                "reply_markup": approval_keyboard(approval.id, lead),
                "disable_web_page_preview": True,
            },
        )
        response.raise_for_status()
        return response.json()


def edit_approval_card(approval: ApprovalRequest, lead: Lead, decision: str | None = None, messages_count: int = 1) -> dict:
    if not telegram_enabled() or not approval.telegram_message_id:
        return {"skipped": True}
    keyboard = approval_keyboard(approval.id, lead) if not decision else None
    with httpx.Client(timeout=20) as client:
        response = client.post(
            _api_url("editMessageText"),
            json={
                "chat_id": settings.telegram_manager_chat_id,
                "message_id": approval.telegram_message_id,
                "text": approval_card(approval, lead, decision=decision, messages_count=messages_count),
                "parse_mode": "HTML",
                **({"reply_markup": keyboard} if keyboard else {"reply_markup": {"inline_keyboard": []}}),
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
