import json
import logging
from datetime import datetime
from html import escape
from zoneinfo import ZoneInfo

import httpx

from app.core.config import settings
from app.models.entities import ApprovalRequest, Lead

_log = logging.getLogger(__name__)


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


def _parse_message_ids(telegram_message_id: str | None) -> list[tuple[str, str]]:
    """Return list of (chat_id, message_id) from stored telegram_message_id (JSON or legacy plain id)."""
    if not telegram_message_id:
        return []
    try:
        data = json.loads(telegram_message_id)
        if isinstance(data, dict):
            return [(chat_id, str(mid)) for chat_id, mid in data.items()]
    except (json.JSONDecodeError, ValueError):
        pass
    # Legacy: plain message_id string, assume primary chat
    if settings.telegram_manager_chat_id:
        return [(settings.telegram_manager_chat_id, telegram_message_id)]
    return []


def _all_manager_chat_ids(extra: list[str] | None = None) -> list[str]:
    ids = [settings.telegram_manager_chat_id] if settings.telegram_manager_chat_id else []
    for item in settings.telegram_extra_manager_chat_ids.split(","):
        item = item.strip()
        if item and item not in ids:
            ids.append(item)
    if extra:
        for item in extra:
            if item and item not in ids:
                ids.append(item)
    return ids


def allowed_manager_ids() -> set[str]:
    return {
        item.strip()
        for item in settings.telegram_allowed_manager_ids.split(",")
        if item.strip()
    }


def is_authorized_manager(manager_id: str, chat_id: str | None = None, extra_allowed: set[str] | None = None) -> bool:
    allowed_ids = allowed_manager_ids()
    if extra_allowed:
        allowed_ids = allowed_ids | extra_allowed
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


def approval_card(
    approval: ApprovalRequest,
    lead: Lead,
    decision: str | None = None,
    messages_count: int = 1,
    last_message_time: str | None = None,
) -> str:
    client_name = lead.client.name if lead.client else "Без имени"
    contact = lead.client.phone if lead.client and lead.client.phone else lead.contact_id or "-"
    score = calc_score(approval.extracted_fields, messages_count)
    reply = approval.edited_reply or approval.ai_reply
    summary_block = (
        f"📋 <b>Контекст диалога:</b>\n{escape(approval.conversation_summary)}\n\n"
        if approval.conversation_summary else ""
    )
    translation_block = ""
    if approval.client_message_translation or approval.ai_reply_translation:
        translation_block = "🌐 <b>Перевод:</b>\n"
        if approval.client_message_translation:
            translation_block += f"<i>Клиент:</i> {escape(approval.client_message_translation)}\n"
        if approval.ai_reply_translation:
            translation_block += f"<i>Ответ ИИ:</i> {escape(approval.ai_reply_translation)}\n"
        translation_block += "\n"
    time_line = f"🕐 <b>Написал:</b> {escape(last_message_time)}\n" if last_message_time else ""
    text = (
        "🟣 <b>Новый AI-ответ</b>\n\n"
        f"👤 <b>Клиент:</b> {escape(client_name or 'Без имени')}\n"
        f"📞 <b>Контакт:</b> {escape(str(contact))}\n"
        f"🧾 <b>Lead ID:</b> {escape(lead.amocrm_lead_id)}\n"
        f"📍 <b>Этап amoCRM:</b> {escape(approval.amocrm_stage_name or str(approval.amocrm_status_id or 'неизвестно'))}\n"
        f"🔥 <b>Score:</b> {score}%\n"
        + time_line
        + "\n"
        + summary_block
        + f'💬 <b>Сообщение клиента:</b>\n"{escape(approval.client_message)}"\n\n'
        + translation_block
        + f"🤖 <b>Ответ бота:</b>\n{escape(reply)}\n\n"
        f"🧠 <b>Память:</b>\n{memory_lines(approval.extracted_fields)}\n\n"
        "⚙️ <b>Действия после принятия:</b>\n"
        "- отправить ответ в amoCRM\n"
        "- сохранить ответ в историю\n"
        "- обновить поля сделки\n"
        "- сохранить исправление менеджера для улучшения бота"
    )
    if decision:
        now = datetime.now(ZoneInfo(settings.timezone)).strftime("%d.%m.%Y %H:%M")
        text += f"\n\n━━━━━━━━━━━━━━━━━━━━\n{decision} · {now}"
        text += f"\n🔗 <a href=\"{lead_url(lead)}\">Открыть лид в amoCRM</a>"
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
                {"text": "📅 Предложить консультацию", "callback_data": f"consult:{approval_id}"},
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


def send_approval_card(
    approval: ApprovalRequest,
    lead: Lead,
    messages_count: int = 1,
    extra_chat_ids: list[str] | None = None,
    last_message_time: str | None = None,
) -> dict:
    if not telegram_enabled():
        return {"skipped": True, "reason": "telegram not configured"}
    card_text = approval_card(approval, lead, messages_count=messages_count, last_message_time=last_message_time)
    keyboard = approval_keyboard(approval.id, lead)
    message_ids: dict[str, str] = {}
    last_response: dict = {}
    with httpx.Client(timeout=20) as client:
        for chat_id in _all_manager_chat_ids(extra_chat_ids):
            try:
                resp = client.post(
                    _api_url("sendMessage"),
                    json={
                        "chat_id": chat_id,
                        "text": card_text,
                        "parse_mode": "HTML",
                        "reply_markup": keyboard,
                        "disable_web_page_preview": True,
                    },
                )
                if resp.is_success:
                    data = resp.json()
                    mid = data.get("result", {}).get("message_id")
                    if mid:
                        message_ids[chat_id] = str(mid)
                    last_response = data
                else:
                    _log.error("telegram send failed chat_id=%s status=%s body=%s",
                               chat_id, resp.status_code, resp.text[:300])
            except Exception as exc:
                _log.error("telegram send error chat_id=%s: %s", chat_id, exc)
    last_response["_message_ids"] = json.dumps(message_ids)
    return last_response


def edit_approval_card(
    approval: ApprovalRequest,
    lead: Lead,
    decision: str | None = None,
    messages_count: int = 1,
    chat_id: str | None = None,
    last_message_time: str | None = None,
) -> dict:
    if not telegram_enabled() or not approval.telegram_message_id:
        return {"skipped": True}
    pairs = _parse_message_ids(approval.telegram_message_id)
    if not pairs:
        return {"skipped": True}
    if decision:
        # Keep lead link button after decision
        keyboard = {"inline_keyboard": [[{"text": "📂 Открыть лид", "url": lead_url(lead)}]]}
    else:
        keyboard = approval_keyboard(approval.id, lead)
    card_text = approval_card(approval, lead, decision=decision, messages_count=messages_count, last_message_time=last_message_time)
    last_response: dict = {}
    with httpx.Client(timeout=20) as client:
        for target_chat, message_id in pairs:
            try:
                resp = client.post(
                    _api_url("editMessageText"),
                    json={
                        "chat_id": target_chat,
                        "message_id": int(message_id),
                        "text": card_text,
                        "parse_mode": "HTML",
                        "reply_markup": keyboard,
                        "disable_web_page_preview": True,
                    },
                )
                if resp.is_success:
                    last_response = resp.json()
                else:
                    _log.error("telegram edit failed chat_id=%s status=%s body=%s",
                               target_chat, resp.status_code, resp.text[:300])
            except Exception as exc:
                _log.error("telegram edit error chat_id=%s: %s", target_chat, exc)
    return last_response


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
