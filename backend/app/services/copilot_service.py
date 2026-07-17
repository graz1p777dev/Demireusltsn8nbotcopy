"""Orchestrates the AI Copilot: knowledge-base lookup for CRM usage
questions, OpenAI function-calling for business-data questions and proposed
actions, RBAC enforcement (via copilot_tools), and persistence.
"""
import json
import logging

from openai import OpenAI
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.copilot_auth import CurrentUser
from app.data.copilot_kb import search_kb
from app.models.entities import CopilotMessage, CopilotPendingAction
from app.services import copilot_tools

_log = logging.getLogger(__name__)

KB_MATCH_THRESHOLD = 2  # keyword-overlap hits needed to answer straight from the KB, no LLM round trip

TOOL_TO_KB_KEY = {
    "get_dialogues_summary": "dialogues",
    "get_analytics_summary": "analytics",
    "get_consultations": "consultations",
    "get_products": "inventory",
    "get_recent_sales": "inventory",
    "get_open_shifts": "inventory",
    "get_expenses": "expenses",
    "propose_create_expense": "expenses",
    "propose_create_consultation": "consultations",
}


def _kb_button(key: str) -> dict | None:
    from app.data.copilot_kb import KB
    entry = next((e for e in KB if e["key"] == key), None)
    if not entry or not entry.get("url"):
        return None
    return {"label": f"Открыть «{entry['title']}»", "href": entry["url"]}


def _answer_from_kb(entry: dict) -> str:
    lines = [entry["description"]]
    if entry.get("actions"):
        lines.append("\n**Как это сделать:**")
        for i, action in enumerate(entry["actions"], 1):
            lines.append(f"{i}. {action}")
    if entry.get("tips"):
        lines.append("\n" + entry["tips"][0])
    return "\n".join(lines)


def _system_prompt(user: CurrentUser, page_context: dict | None) -> str:
    ctx = ""
    if page_context and page_context.get("path"):
        ctx = f"\nПользователь сейчас находится на странице: {page_context['path']}."
        if page_context.get("extra"):
            ctx += f" Доп. контекст: {json.dumps(page_context['extra'], ensure_ascii=False)}."
    return (
        "Ты — ИИ-помощник (Copilot) внутри CRM Demi Results. Отвечай кратко, по делу, без воды. "
        "Для вопросов о том, как пользоваться CRM — используй только вызванные инструменты/базу знаний, "
        "не выдумывай кнопки или разделы, которых нет. "
        "Для вопросов о данных компании (продажи, расходы, консультации, товары, сотрудники) вызывай "
        "соответствующий инструмент — никогда не придумывай цифры сам. "
        "Если инструмент недоступен из-за прав доступа — вежливо сообщи, что этот раздел недоступен, "
        "не пытайся обойти ограничение. "
        f"Пользователь: {user.username}, администратор: {'да' if user.is_admin else 'нет'}."
        f"{ctx} "
        "Если вопрос касается расходов, товаров, клиентов, задач или сотрудников, которых нет в системе "
        "(например создание клиента или задачи) — скажи, что это пока не реализовано в CRM."
    )


def _dispatch_tool(db: Session, user: CurrentUser, name: str, args: dict) -> tuple[dict, dict | None]:
    """Returns (tool_result_for_model, pending_action_payload_or_None)."""
    try:
        if name in copilot_tools.PROPOSE_TOOLS:
            fn = copilot_tools.PROPOSE_TOOLS[name]
            payload = fn(user=user, **args)
            return {"status": "awaiting_confirmation", "proposed": payload}, payload

        fn = copilot_tools.READ_TOOLS.get(name)
        if not fn:
            return {"error": f"Unknown tool {name}"}, None

        if name in ("get_dialogues_summary", "get_analytics_summary", "get_consultations", "get_expenses"):
            result = fn(db=db, user=user, **args)
        else:
            result = fn(user=user, **args)
        return result, None
    except copilot_tools.ToolError as e:
        return {"error": e.message}, None


def handle_message(
    db: Session,
    user: CurrentUser,
    conversation_id: int,
    user_text: str,
    page_context: dict | None = None,
) -> dict:
    kb_hits = search_kb(user_text, top_k=1)
    if kb_hits and _kb_score_ok(user_text, kb_hits[0]):
        entry = kb_hits[0]
        reply = _answer_from_kb(entry)
        button = _kb_button(entry["key"])
        return {"reply": reply, "buttons": [button] if button else [], "quick_actions": [], "pending_action": None}

    if not settings.openai_api_key:
        return {
            "reply": "ИИ-помощник временно недоступен: не настроен ключ OpenAI.",
            "buttons": [], "quick_actions": [], "pending_action": None,
        }

    client = OpenAI(api_key=settings.openai_api_key)
    messages = [
        {"role": "system", "content": _system_prompt(user, page_context)},
        {"role": "user", "content": user_text},
    ]

    buttons: list[dict] = []
    pending_payload: dict | None = None
    pending_tool_name: str | None = None

    response = client.chat.completions.create(
        model=settings.copilot_openai_model,
        messages=messages,
        tools=copilot_tools.TOOL_SCHEMAS,
        tool_choice="auto",
    )
    msg = response.choices[0].message

    if msg.tool_calls:
        messages.append({"role": "assistant", "content": msg.content, "tool_calls": [
            {"id": tc.id, "type": "function", "function": {"name": tc.function.name, "arguments": tc.function.arguments}}
            for tc in msg.tool_calls
        ]})
        for tc in msg.tool_calls:
            name = tc.function.name
            try:
                args = json.loads(tc.function.arguments or "{}")
            except json.JSONDecodeError:
                args = {}
            result, pending = _dispatch_tool(db, user, name, args)
            if pending is not None:
                pending_payload = pending
                pending_tool_name = name
            kb_key = TOOL_TO_KB_KEY.get(name)
            if kb_key and "error" not in result:
                btn = _kb_button(kb_key)
                if btn and btn not in buttons:
                    buttons.append(btn)
            messages.append({
                "role": "tool", "tool_call_id": tc.id,
                "content": json.dumps(result, ensure_ascii=False, default=str),
            })

        follow_up = client.chat.completions.create(
            model=settings.copilot_openai_model,
            messages=messages,
        )
        reply = follow_up.choices[0].message.content or ""
    else:
        reply = msg.content or ""

    pending_action = None
    if pending_payload is not None:
        action = CopilotPendingAction(
            conversation_id=conversation_id,
            tool_name=pending_tool_name,
            payload=pending_payload,
            status="pending",
        )
        db.add(action)
        db.commit()
        db.refresh(action)
        pending_action = {"id": action.id, "tool_name": action.tool_name, "payload": action.payload}

    return {"reply": reply, "buttons": buttons, "quick_actions": [], "pending_action": pending_action}


def _kb_score_ok(query: str, entry: dict) -> bool:
    q_words = {w for w in query.lower().replace("?", "").split() if len(w) > 2}
    haystack = " ".join([entry["title"], entry["description"], entry["purpose"]]).lower()
    return sum(1 for w in q_words if w in haystack) >= KB_MATCH_THRESHOLD


def save_message(db: Session, conversation_id: int, role: str, content: str,
                  buttons: list | None = None, quick_actions: list | None = None) -> CopilotMessage:
    message = CopilotMessage(
        conversation_id=conversation_id, role=role, content=content,
        buttons=buttons or None, quick_actions=quick_actions or None,
    )
    db.add(message)
    db.commit()
    db.refresh(message)
    return message
