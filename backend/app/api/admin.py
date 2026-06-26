from collections import Counter, defaultdict

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import desc, func, select, text
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.entities import (
    ActionLog,
    AIExtractedFields,
    AIUsage,
    ApprovalRequest,
    ClientMemory,
    Lead,
    Message,
    Setting,
    TrainingExample,
)
from app.services import amocrm

router = APIRouter(prefix="/admin", tags=["admin"])


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
    consultation_confirmed = db.scalar(text(
        "SELECT COUNT(*) FROM ai_extracted_fields WHERE consultation_confirmed = true"
    )) or 0

    return {
        "hourly": hourly_full,
        "daily": daily,
        "top_problems": top_problems,
        "stats": {
            "total_leads": total_leads,
            "total_messages": total_messages,
            "total_approvals": total_approvals,
            "approved": approved,
            "consultation_confirmed": int(consultation_confirmed),
        },
    }
