import json as _json
from collections import Counter, defaultdict
from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import desc, func, select, text
from sqlalchemy.orm import Session

from app.core.config import settings as app_settings
from app.db.session import get_db
from app.models.entities import (
    ActionLog,
    AIExtractedFields,
    AIUsage,
    ApprovalRequest,
    ClientMemory,
    ConsultationSlot,
    Lead,
    Message,
    Setting,
    TrainingExample,
)
from app.services.slots import day_slots, is_working_day
from app.services import amocrm

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/chat/{amocrm_lead_id}")
def get_chat_history(amocrm_lead_id: str, db: Session = Depends(get_db)) -> dict:
    lead = db.scalar(select(Lead).where(Lead.amocrm_lead_id == amocrm_lead_id))
    if not lead:
        raise HTTPException(404, "Lead not found")
    messages = db.scalars(
        select(Message).where(Message.lead_id == lead.id).order_by(Message.created_at)
    ).all()
    client = lead.client
    return {
        "lead_id": lead.amocrm_lead_id,
        "client_name": client.name if client else None,
        "client_phone": client.phone if client else None,
        "amocrm_url": f"{app_settings.amocrm_base_url.rstrip('/')}/leads/detail/{lead.amocrm_lead_id}",
        "messages": [
            {
                "id": m.id,
                "role": m.role,
                "text": m.text,
                "status": m.status,
                "created_at": m.created_at.isoformat() if m.created_at else None,
            }
            for m in messages
        ],
    }


class ToggleAI(BaseModel):
    enabled: bool


class ManualMessage(BaseModel):
    text: str


@router.get("/conversations")
def conversations(db: Session = Depends(get_db)) -> list[dict]:
    rows = db.scalars(select(Lead).order_by(desc(Lead.updated_at))).all()
    return [
        {
            "id": row.id,
            "amocrm_lead_id": row.amocrm_lead_id,
            "chat_id": row.chat_id,
            "contact_id": row.contact_id,
            "ai_enabled": row.ai_enabled,
            "last_message_at": row.last_message_at,
            "client": row.client.name if row.client else None,
            "phone": row.client.phone if row.client else None,
        }
        for row in rows
    ]


@router.get("/leads/{lead_id}")
def lead_detail(lead_id: int, db: Session = Depends(get_db)) -> dict:
    lead = db.get(Lead, lead_id)
    if not lead:
        raise HTTPException(404)
    messages = db.scalars(select(Message).where(Message.lead_id == lead.id).order_by(Message.created_at)).all()
    logs = db.scalars(select(ActionLog).where(ActionLog.lead_id == lead.id).order_by(desc(ActionLog.created_at)).limit(100)).all()
    extracted = db.scalars(
        select(AIExtractedFields).where(AIExtractedFields.lead_id == lead.id).order_by(desc(AIExtractedFields.created_at)).limit(10)
    ).all()
    memory = db.scalars(select(ClientMemory).where(ClientMemory.lead_id == lead.id).order_by(desc(ClientMemory.created_at))).all()
    approvals = db.scalars(
        select(ApprovalRequest)
        .where(ApprovalRequest.lead_id == lead.id)
        .order_by(desc(ApprovalRequest.created_at))
        .limit(20)
    ).all()
    usage = db.scalars(
        select(AIUsage).where(AIUsage.lead_id == lead.id).order_by(desc(AIUsage.created_at)).limit(50)
    ).all()
    training_examples = db.scalars(
        select(TrainingExample)
        .where(TrainingExample.lead_id == lead.id)
        .order_by(desc(TrainingExample.created_at))
        .limit(20)
    ).all()
    usage_summary = db.execute(
        select(
            func.coalesce(func.sum(AIUsage.prompt_tokens), 0),
            func.coalesce(func.sum(AIUsage.completion_tokens), 0),
            func.coalesce(func.sum(AIUsage.total_tokens), 0),
            func.coalesce(func.sum(AIUsage.total_cost), 0),
        ).where(AIUsage.lead_id == lead.id)
    ).one()
    return {
        "lead": {
            "id": lead.id,
            "amocrm_lead_id": lead.amocrm_lead_id,
            "chat_id": lead.chat_id,
            "contact_id": lead.contact_id,
            "ai_enabled": lead.ai_enabled,
            "client": lead.client.name if lead.client else None,
        },
        "messages": [{"role": m.role, "text": m.text, "status": m.status, "created_at": m.created_at} for m in messages],
        "logs": [
            {
                "action": log.action,
                "status": log.status,
                "error": log.error,
                "created_at": log.created_at,
            }
            for log in logs
        ],
        "extracted": [item.raw_output for item in extracted],
        "memory": [{"key": item.key, "value": item.value, "source": item.source} for item in memory],
        "approvals": [
            {
                "id": item.id,
                "status": item.status,
                "client_message": item.client_message,
                "ai_reply": item.ai_reply,
                "edited_reply": item.edited_reply,
                "manager_telegram_id": item.manager_telegram_id,
                "amocrm_stage_name": item.amocrm_stage_name,
                "amocrm_status_id": item.amocrm_status_id,
                "created_at": item.created_at,
                "approved_at": item.approved_at,
            }
            for item in approvals
        ],
        "usage_summary": {
            "prompt_tokens": int(usage_summary[0] or 0),
            "completion_tokens": int(usage_summary[1] or 0),
            "total_tokens": int(usage_summary[2] or 0),
            "total_cost": float(usage_summary[3] or 0),
        },
        "usage": [
            {
                "provider": item.provider,
                "model": item.model,
                "purpose": item.purpose,
                "prompt_tokens": item.prompt_tokens,
                "completion_tokens": item.completion_tokens,
                "total_tokens": item.total_tokens,
                "total_cost": item.total_cost,
                "latency_ms": item.latency_ms,
                "created_at": item.created_at,
            }
            for item in usage
        ],
        "training_examples": [
            {
                "id": item.id,
                "client_message": item.client_message,
                "ai_reply": item.ai_reply,
                "final_reply": item.final_reply,
                "was_edited": item.was_edited,
                "quality_label": item.quality_label,
                "created_at": item.created_at,
            }
            for item in training_examples
        ],
    }


@router.patch("/leads/{lead_id}/ai")
def toggle_ai(lead_id: int, payload: ToggleAI, db: Session = Depends(get_db)) -> dict:
    lead = db.get(Lead, lead_id)
    if not lead:
        raise HTTPException(404)
    lead.ai_enabled = payload.enabled
    db.commit()
    return {"ok": True, "ai_enabled": lead.ai_enabled}


@router.post("/leads/{lead_id}/messages")
def send_manual_message(lead_id: int, payload: ManualMessage, db: Session = Depends(get_db)) -> dict:
    lead = db.get(Lead, lead_id)
    if not lead:
        raise HTTPException(404)
    session = amocrm.create_chat_session()
    result = amocrm.send_chat_message(session, lead.chat_id or "", lead.amocrm_lead_id, lead.contact_id, payload.text)
    db.add(ActionLog(lead_id=lead.id, action="operator.send_message", status="success", request_payload=payload.model_dump(), response_payload=result))
    db.commit()
    return {"ok": True, "result": result}


@router.get("/settings")
def list_settings(db: Session = Depends(get_db)) -> list[dict]:
    rows = db.scalars(select(Setting).order_by(Setting.key)).all()
    return [{"key": row.key, "value": "***" if row.is_secret else row.value, "is_secret": row.is_secret} for row in rows]


class BotPromptUpdate(BaseModel):
    prompt: str


@router.get("/bot-prompt")
def get_bot_prompt(db: Session = Depends(get_db)) -> dict:
    from app.services.prompts import SALES_AGENT_SYSTEM_PROMPT
    row = db.scalar(select(Setting).where(Setting.key == "bot_system_prompt"))
    return {"prompt": row.value if row else SALES_AGENT_SYSTEM_PROMPT}


@router.patch("/bot-prompt")
def update_bot_prompt(body: BotPromptUpdate, db: Session = Depends(get_db)) -> dict:
    row = db.scalar(select(Setting).where(Setting.key == "bot_system_prompt"))
    if row:
        row.value = body.prompt
    else:
        db.add(Setting(key="bot_system_prompt", value=body.prompt, is_secret=False))
    db.commit()
    return {"ok": True}


class AiTestRequest(BaseModel):
    message: str
    history: list[dict] = []  # [{"role": "user"|"assistant", "content": "..."}]


@router.post("/ai-test")
def ai_test(body: AiTestRequest, db: Session = Depends(get_db)) -> dict:
    from app.services.openai_service import generate_reply
    from app.services.prompts import SALES_AGENT_SYSTEM_PROMPT
    from zoneinfo import ZoneInfo

    row = db.scalar(select(Setting).where(Setting.key == "bot_system_prompt"))
    system_prompt = row.value if row else SALES_AGENT_SYSTEM_PROMPT

    now = datetime.now(ZoneInfo(app_settings.timezone))
    slot_context = {
        "now_bishkek": now.strftime("%H:%M"),
        "date_bishkek": now.strftime("%d.%m.%Y"),
        "is_working_hours": True,
        "minutes_since_last_message": 9999,
        "free_slots": [],
        "client_language": "ru",
    }

    dialogue = [
        {"role": m["role"], "content": m["content"]}
        for m in body.history
    ]
    dialogue.append({"role": "user", "content": body.message})

    try:
        result = generate_reply(dialogue, slot_context, system_prompt=system_prompt)
        return {"ok": True, "reply": str(result.content), "tokens": result.total_tokens, "model": result.model}
    except Exception as e:
        return {"ok": False, "reply": f"Ошибка: {e}"}


@router.get("/analytics")
def get_analytics(db: Session = Depends(get_db)) -> dict:
    # Hourly distribution of client messages (Bishkek UTC+6)
    hourly_rows = db.execute(text(
        "SELECT EXTRACT(HOUR FROM created_at AT TIME ZONE 'Asia/Bishkek') AS hour, COUNT(*) "
        "FROM messages WHERE role='user' GROUP BY hour ORDER BY hour"
    )).fetchall()
    hourly = {int(r[0]): int(r[1]) for r in hourly_rows}
    hourly_full = [{"hour": h, "count": hourly.get(h, 0)} for h in range(24)]

    # Daily message volume (last 30 days)
    daily_rows = db.execute(text(
        "SELECT DATE(created_at AT TIME ZONE 'Asia/Bishkek') AS day, COUNT(*) "
        "FROM messages WHERE role='user' AND created_at >= NOW() - INTERVAL '30 days' "
        "GROUP BY day ORDER BY day"
    )).fetchall()
    daily = [{"date": str(r[0]), "count": int(r[1])} for r in daily_rows]

    # Top problems from extracted fields
    extracted_rows = db.execute(text(
        "SELECT skin_problem FROM ai_extracted_fields WHERE skin_problem IS NOT NULL AND skin_problem != '[]'"
    )).fetchall()
    problem_counter: Counter = Counter()
    for row in extracted_rows:
        problems = row[0] if isinstance(row[0], list) else []
        for p in problems:
            if p:
                problem_counter[p] += 1
    top_problems = [{"problem": k, "count": v} for k, v in problem_counter.most_common(12)]

    # Summary stats
    total_leads = db.scalar(select(func.count()).select_from(Lead)) or 0
    total_messages = db.scalar(
        select(func.count()).select_from(Message).where(Message.role == "user")
    ) or 0
    total_approvals = db.scalar(select(func.count()).select_from(ApprovalRequest)) or 0
    approved = db.scalar(
        select(func.count()).select_from(ApprovalRequest)
        .where(ApprovalRequest.status == "approved")
    ) or 0
    # Approved without editing (ai_reply sent as-is)
    approved_as_is = db.scalar(
        select(func.count()).select_from(ApprovalRequest)
        .where(ApprovalRequest.status == "approved")
        .where(ApprovalRequest.edited_reply.is_(None))
    ) or 0
    rejected = db.scalar(
        select(func.count()).select_from(ApprovalRequest)
        .where(ApprovalRequest.status == "rejected")
    ) or 0
    consultation_confirmed = db.scalar(text(
        "SELECT COUNT(*) FROM ai_extracted_fields WHERE consultation_confirmed = true"
    )) or 0

    # Token usage & cost
    token_row = db.execute(text(
        "SELECT COALESCE(SUM(prompt_tokens),0), COALESCE(SUM(completion_tokens),0), "
        "COALESCE(SUM(total_tokens),0), COALESCE(SUM(total_cost),0) FROM ai_usage"
    )).one()

    return {
        "hourly": hourly_full,
        "daily": daily,
        "top_problems": top_problems,
        "stats": {
            "total_leads": total_leads,
            "total_messages": total_messages,
            "total_approvals": total_approvals,
            "approved": approved,
            "approved_as_is": int(approved_as_is),
            "rejected": int(rejected),
            "consultation_confirmed": int(consultation_confirmed),
            "prompt_tokens": int(token_row[0]),
            "completion_tokens": int(token_row[1]),
            "total_tokens": int(token_row[2]),
            "total_cost": float(token_row[3]),
        },
    }


# ── Managers ────────────────────────────────────────────────────────────────

class ManagerPayload(BaseModel):
    name: str
    chat_id: str


def _get_managers_setting(db: Session):
    return db.scalar(select(Setting).where(Setting.key == "telegram_managers"))


@router.get("/managers")
def list_managers(db: Session = Depends(get_db)) -> list[dict]:
    row = _get_managers_setting(db)
    if not row or not row.value:
        return []
    try:
        return _json.loads(row.value)
    except Exception:
        return []


@router.post("/managers")
def add_manager(payload: ManagerPayload, db: Session = Depends(get_db)) -> dict:
    row = _get_managers_setting(db)
    managers: list[dict] = []
    if row and row.value:
        try:
            managers = _json.loads(row.value)
        except Exception:
            managers = []
    # Deduplicate by chat_id
    if any(m["chat_id"] == payload.chat_id for m in managers):
        raise HTTPException(400, "Manager with this chat_id already exists")
    managers.append({"name": payload.name, "chat_id": payload.chat_id})
    if row:
        row.value = _json.dumps(managers, ensure_ascii=False)
    else:
        db.add(Setting(key="telegram_managers", value=_json.dumps(managers, ensure_ascii=False), is_secret=False))
    db.commit()
    return {"ok": True, "managers": managers}


@router.delete("/managers/{chat_id}")
def remove_manager(chat_id: str, db: Session = Depends(get_db)) -> dict:
    row = _get_managers_setting(db)
    if not row or not row.value:
        raise HTTPException(404, "Manager not found")
    try:
        managers = _json.loads(row.value)
    except Exception:
        managers = []
    new_managers = [m for m in managers if m["chat_id"] != chat_id]
    if len(new_managers) == len(managers):
        raise HTTPException(404, "Manager not found")
    row.value = _json.dumps(new_managers, ensure_ascii=False)
    db.commit()
    return {"ok": True, "managers": new_managers}


# ── Consultation Slots ───────────────────────────────────────────────────────

WEEKDAYS_RU = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"]
MONTHS_RU = ["", "янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"]


class SlotStatusUpdate(BaseModel):
    status: str  # "free" | "blocked" | "booked"


class SlotCreate(BaseModel):
    date: str   # "YYYY-MM-DD"
    time: str   # "HH:MM"
    status: str = "blocked"


@router.get("/slots")
def get_slots(days: int = 21, db: Session = Depends(get_db)) -> dict:
    tz = ZoneInfo(app_settings.timezone)
    today = datetime.now(tz).date()

    dates: list[date] = [today + timedelta(days=i) for i in range(days)]

    # Fetch all DB slots for this range
    db_slots = db.scalars(
        select(ConsultationSlot).where(
            ConsultationSlot.date >= dates[0],
            ConsultationSlot.date <= dates[-1],
        )
    ).all()
    slot_map: dict[tuple[date, str], ConsultationSlot] = {
        (s.date, s.time.strftime("%H:%M")): s for s in db_slots
    }

    schedule = []
    for day in dates:
        times = day_slots(day)
        working = is_working_day(day)
        slots = []
        for t in times:
            db_slot = slot_map.get((day, t))
            slots.append({
                "time": t,
                "status": db_slot.status if db_slot else "free",
                "id": db_slot.id if db_slot else None,
                "lead_id": db_slot.lead_id if db_slot else None,
            })
        schedule.append({
            "date": day.isoformat(),
            "label": f"{WEEKDAYS_RU[day.weekday()]} {day.day} {MONTHS_RU[day.month]}",
            "is_working": working,
            "slots": slots,
        })

    return {"schedule": schedule, "interval_minutes": app_settings.consultation_interval_minutes}


@router.post("/slots")
def create_slot(body: SlotCreate, db: Session = Depends(get_db)) -> dict:
    try:
        d = date.fromisoformat(body.date)
        t = time.fromisoformat(body.time)
    except ValueError:
        raise HTTPException(400, "Invalid date or time format")

    existing = db.scalar(
        select(ConsultationSlot).where(
            ConsultationSlot.date == d,
            ConsultationSlot.time == t,
        )
    )
    if existing:
        existing.status = body.status
        db.commit()
        return {"ok": True, "slot": {"id": existing.id, "status": existing.status}}

    slot = ConsultationSlot(date=d, time=t, status=body.status)
    db.add(slot)
    db.commit()
    return {"ok": True, "slot": {"id": slot.id, "status": slot.status}}


@router.patch("/slots/{slot_id}")
def update_slot(slot_id: int, body: SlotStatusUpdate, db: Session = Depends(get_db)) -> dict:
    slot = db.get(ConsultationSlot, slot_id)
    if not slot:
        raise HTTPException(404, "Slot not found")
    slot.status = body.status
    db.commit()
    return {"ok": True, "slot": {"id": slot.id, "status": slot.status}}


@router.delete("/slots/{slot_id}")
def delete_slot(slot_id: int, db: Session = Depends(get_db)) -> dict:
    slot = db.get(ConsultationSlot, slot_id)
    if not slot:
        raise HTTPException(404, "Slot not found")
    db.delete(slot)
    db.commit()
    return {"ok": True}
