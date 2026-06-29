from datetime import datetime
from zoneinfo import ZoneInfo

from sqlalchemy import select

from app.core.config import settings
from app.db.session import SessionLocal
from app.models.entities import (
    ActionLog,
    AIExtractedFields,
    AIUsage,
    ApprovalRequest,
    Lead,
    Message,
    MessageBuffer,
    Setting,
    TrainingExample,
)
from app.services import amocrm, google_sheets, telegram
from app.services.openai_service import AIResult, ai_edit_reply, classify_sales_intent, detect_and_translate, detect_language, extract_fields, generate_reply, summarize_dialogue
from app.services.slots import check_consultation_slots
from app.tasks.celery_app import celery_app


def log_action(db, lead_id: int | None, action: str, status: str, request=None, response=None, error=None) -> None:
    db.add(
        ActionLog(
            lead_id=lead_id,
            action=action,
            status=status,
            request_payload=request,
            response_payload=response,
            error=str(error) if error else None,
        )
    )
    db.commit()


def save_ai_usage(db, lead_id: int, result: AIResult, message_id: int | None = None) -> None:
    db.add(
        AIUsage(
            lead_id=lead_id,
            message_id=message_id,
            provider="openai",
            model=result.model,
            purpose=result.purpose,
            prompt_tokens=result.prompt_tokens,
            completion_tokens=result.completion_tokens,
            total_tokens=result.total_tokens,
            input_cost=result.input_cost,
            output_cost=result.output_cost,
            total_cost=result.total_cost,
            latency_ms=result.latency_ms,
            raw_usage=result.raw_usage,
        )
    )
    db.commit()


def move_lead_status(db, lead: Lead, status_id: int | None, reason: str) -> None:
    if not status_id:
        return
    try:
        response = amocrm.patch_lead_status(lead.amocrm_lead_id, status_id)
        lead.status_id = status_id
        log_action(
            db,
            lead.id,
            "amocrm.move_lead_status",
            "success",
            {"reason": reason, "status_id": status_id},
            response,
        )
    except Exception as exc:
        log_action(
            db,
            lead.id,
            "amocrm.move_lead_status",
            "error",
            {"reason": reason, "status_id": status_id},
            error=exc,
        )


def _lead_stage_snapshot(db, lead: Lead) -> dict:
    if not settings.amocrm_access_token:
        return {}
    try:
        stage = amocrm.lead_stage_snapshot(lead.amocrm_lead_id)
        if stage.get("status_id"):
            lead.status_id = stage["status_id"]
            db.commit()
        return stage
    except Exception as exc:
        log_action(db, lead.id, "amocrm.get_lead_stage", "error", error=exc)
        return {}


def _mark_buffers_processed(db, buffers: list[MessageBuffer]) -> None:
    for item in buffers:
        item.processed = True
    db.commit()


def _load_templates(db) -> list[dict]:
    try:
        import json as _json
        row = db.scalar(select(Setting).where(Setting.key == "reply_templates"))
        return _json.loads(row.value) if row and row.value else []
    except Exception:
        return []


def _load_extra_manager_ids(db) -> list[str]:
    """Return chat IDs of managers stored in settings table."""
    try:
        row = db.scalar(select(Setting).where(Setting.key == "telegram_managers"))
        if not row or not row.value:
            return []
        import json as _json
        managers = _json.loads(row.value)
        return [str(m["chat_id"]) for m in managers if m.get("chat_id")]
    except Exception:
        return []


def _has_card_data(extracted: dict) -> bool:
    if extracted.get("skin_problem"):
        return True
    return any(
        extracted.get(key)
        for key in ("consultation_format", "city", "experience", "name", "contacts")
    )


def apply_sales_stage_from_extracted(db, lead: Lead, extracted: dict) -> None:
    if extracted.get("consultation_confirmed"):
        move_lead_status(
            db,
            lead,
            settings.amocrm_status_consultation_scheduled,
            "consultation_confirmed",
        )
        return
    if _has_card_data(extracted):
        move_lead_status(db, lead, settings.amocrm_status_qualified, "lead_card_filled")


@celery_app.task(name="process_lead_buffer", autoretry_for=(Exception,), retry_backoff=True, max_retries=3)
def process_lead_buffer(lead_pk: int, triggering_message_id: str) -> None:
    db = SessionLocal()
    try:
        lead = db.get(Lead, lead_pk)
        if not lead or not lead.ai_enabled:
            return
        buffers = db.scalars(
            select(MessageBuffer)
            .where(MessageBuffer.lead_id == lead.id, MessageBuffer.processed.is_(False))
            .order_by(MessageBuffer.timestamp.asc())
        ).all()
        if not buffers or buffers[-1].message_id != triggering_message_id:
            return
        existing_reply = db.scalar(
            select(Message).where(
                Message.lead_id == lead.id,
                Message.message_id == f"ai:{triggering_message_id}",
            )
        )
        if existing_reply:
            return
        existing_approval = db.scalar(
            select(ApprovalRequest).where(
                ApprovalRequest.lead_id == lead.id,
                ApprovalRequest.status.in_(["pending", "edited"]),
            )
        )
        if existing_approval:
            return

        combined_text = " ".join(item.text for item in buffers if item.text).strip()
        conversation_id = buffers[-1].conversation_id

        all_messages = db.scalars(
            select(Message)
            .where(Message.lead_id == lead.id)
            .order_by(Message.created_at.asc())
        ).all()
        full_dialogue = [{"role": m.role, "content": m.text} for m in all_messages if m.text]
        if combined_text and (not full_dialogue or full_dialogue[-1]["content"] != combined_text):
            full_dialogue.append({"role": "user", "content": combined_text})

        # last 20 messages for reply generation
        dialogue = full_dialogue[-20:]

        stage = _lead_stage_snapshot(db, lead)
        if (
            settings.amocrm_status_consultation_scheduled
            and stage.get("status_id") == settings.amocrm_status_consultation_scheduled
        ):
            _mark_buffers_processed(db, buffers)
            log_action(
                db,
                lead.id,
                "pipeline.skip_scheduled_consultation",
                "skipped",
                {"status_id": stage.get("status_id"), "stage_name": stage.get("stage_name")},
            )
            return

        intent_result = classify_sales_intent(dialogue, combined_text)
        intent = dict(intent_result.content)
        save_ai_usage(db, lead.id, intent_result)
        log_action(
            db,
            lead.id,
            "openai.sales_intent",
            "success",
            request={"latest_message": combined_text},
            response={"intent": intent, "usage": intent_result.model_dump(exclude={"content"})},
        )
        if not intent.get("is_sales", True):
            move_lead_status(db, lead, settings.amocrm_status_unsorted, "non_sales_message")
            _mark_buffers_processed(db, buffers)
            log_action(
                db,
                lead.id,
                "pipeline.non_sales_routed",
                "skipped",
                {"reason": intent.get("reason"), "message": combined_text},
            )
            return

        move_lead_status(db, lead, settings.amocrm_status_primary_contact, "sales_message")

        slot_context = check_consultation_slots(db)
        _now_bk = datetime.now(ZoneInfo(settings.timezone))
        slot_context["now_bishkek"] = _now_bk.strftime("%H:%M")
        slot_context["date_bishkek"] = _now_bk.strftime("%d.%m.%Y")
        slot_context["is_working_hours"] = 10 <= _now_bk.hour < 21
        slot_context["client_language"] = detect_language(combined_text)

        # Time of current client message (for card display)
        _current_msg_bk = buffers[-1].timestamp.astimezone(ZoneInfo(settings.timezone))
        _last_msg_display = _current_msg_bk.strftime("%H:%M %d.%m.%Y")

        # Minutes since previous client message (for greeting logic)
        _prev_user_msgs = [m for m in all_messages if m.role == "user" and m.created_at]
        if _prev_user_msgs:
            _prev_last_bk = _prev_user_msgs[-1].created_at.astimezone(ZoneInfo(settings.timezone))
            _minutes_since = int((_now_bk - _prev_last_bk).total_seconds() / 60)
        else:
            _minutes_since = 9999
        slot_context["minutes_since_last_message"] = _minutes_since
        custom_prompt = db.scalar(select(Setting).where(Setting.key == "bot_system_prompt"))
        reply_result = generate_reply(dialogue, slot_context, system_prompt=custom_prompt.value if custom_prompt else None)
        reply = str(reply_result.content)
        save_ai_usage(db, lead.id, reply_result)
        log_action(
            db,
            lead.id,
            "openai.sales_agent",
            "success",
            request={"dialogue_messages": len(dialogue), "slot_context": slot_context},
            response=reply_result.model_dump(exclude={"content"}),
        )

        updated_dialogue = dialogue + [{"role": "assistant", "content": reply}]
        extracted_result = extract_fields(updated_dialogue, lead.client.name if lead.client else None)
        extracted = dict(extracted_result.content)
        save_ai_usage(db, lead.id, extracted_result)
        db.add(AIExtractedFields(lead_id=lead.id, raw_output=extracted, **extracted))
        db.commit()
        log_action(
            db,
            lead.id,
            "openai.extract_fields",
            "success",
            response={"fields": extracted, "usage": extracted_result.model_dump(exclude={"content"})},
        )

        if settings.human_approval_enabled:
            _mark_buffers_processed(db, buffers)
            stage = _lead_stage_snapshot(db, lead)
            _user_msgs = [m for m in full_dialogue if m.get("role") == "user"]
            conv_summary, hypervisor_usage = summarize_dialogue(full_dialogue) if len(_user_msgs) > 1 else ("", None)
            if hypervisor_usage:
                save_ai_usage(db, lead.id, hypervisor_usage)
            translations = detect_and_translate(combined_text, reply)
            extra_managers = _load_extra_manager_ids(db)
            approval = ApprovalRequest(
                lead_id=lead.id,
                chat_id=lead.chat_id or "",
                client_message=combined_text,
                ai_reply=reply,
                status="pending",
                extracted_fields=extracted,
                amocrm_pipeline_id=stage.get("pipeline_id"),
                amocrm_status_id=stage.get("status_id"),
                amocrm_stage_name=stage.get("stage_name"),
                conversation_summary=conv_summary or None,
                client_message_translation=translations["client_translation"],
                ai_reply_translation=translations["ai_reply_translation"],
            )
            db.add(approval)
            db.commit()
            try:
                _templates_exist = bool(_load_templates(db))
                response = telegram.send_approval_card(
                    approval, lead, messages_count=len(dialogue),
                    extra_chat_ids=extra_managers, last_message_time=_last_msg_display,
                    has_templates=_templates_exist,
                )
                message_ids_json = response.get("_message_ids")
                if message_ids_json:
                    approval.telegram_message_id = message_ids_json
                log_action(db, lead.id, "telegram.approval_request", "success", response=response)
            except Exception as exc:
                approval.status = "failed"
                log_action(db, lead.id, "telegram.approval_request", "error", error=exc)
            db.commit()
            return

        _mark_buffers_processed(db, buffers)
        send_approved_reply(db, lead, conversation_id, triggering_message_id, reply, extracted)
    finally:
        db.close()


def send_approved_reply(
    db,
    lead: Lead,
    conversation_id: int,
    triggering_message_id: str,
    reply: str,
    extracted: dict | None,
    approval: ApprovalRequest | None = None,
) -> bool:
    assistant_message = db.scalar(
        select(Message).where(
            Message.lead_id == lead.id,
            Message.message_id == f"ai:{triggering_message_id}",
        )
    )
    if assistant_message:
        assistant_message.text = reply
        assistant_message.status = "approved"
    else:
        assistant_message = Message(
            conversation_id=conversation_id,
            lead_id=lead.id,
            message_id=f"ai:{triggering_message_id}",
            role="assistant",
            direction="outgoing",
            text=reply,
            status="approved",
        )
        db.add(assistant_message)
    db.commit()

    try:
        session = amocrm.create_chat_session()
        response = amocrm.send_chat_message(
            session,
            lead.chat_id or "",
            lead.amocrm_lead_id,
            lead.contact_id,
            reply,
        )
        assistant_message.status = "sent"
        if approval:
            approval.status = "sent"
        log_action(db, lead.id, "amocrm.send_message", "success", {"text": reply}, response)
    except Exception as exc:
        assistant_message.status = "send_failed"
        if approval:
            approval.status = "failed"
        log_action(db, lead.id, "amocrm.send_message", "error", {"text": reply}, error=exc)
        db.commit()
        return False
    db.commit()

    if extracted and settings.amocrm_access_token:
        update_integrations_after_approval(db, lead, extracted)
    return True


def update_integrations_after_approval(db, lead: Lead, extracted: dict) -> None:
    if settings.amocrm_access_token:
        try:
            fields = amocrm.get_lead_fields()
            patch = amocrm.build_lead_patch(lead.amocrm_lead_id, extracted, fields)
            if patch:
                response = amocrm.patch_lead(patch)
                log_action(db, lead.id, "amocrm.patch_lead", "success", patch, response)
            else:
                log_action(db, lead.id, "amocrm.patch_lead", "skipped", extracted, {"reason": "no fields"})
        except Exception as exc:
            log_action(db, lead.id, "amocrm.patch_lead", "error", extracted, error=exc)

    if extracted.get("consultation_confirmed") and extracted.get("consultation_date") and extracted.get("consultation_time"):
        try:
            response = google_sheets.update_consultation_sheet(
                extracted, lead.amocrm_lead_id, chat_id=lead.chat_id or ""
            )
            log_action(db, lead.id, "google_sheets.update_consultation", "success", extracted, response)
        except Exception as exc:
            log_action(db, lead.id, "google_sheets.update_consultation", "error", extracted, error=exc)

    if settings.amocrm_access_token:
        apply_sales_stage_from_extracted(db, lead, extracted)


def _get_session(db, key: str) -> str | None:
    setting = db.scalar(select(Setting).where(Setting.key == key))
    return setting.value if setting else None


def _set_session(db, key: str, value: str) -> None:
    setting = db.scalar(select(Setting).where(Setting.key == key))
    if setting:
        setting.value = value
    else:
        db.add(Setting(key=key, value=value, is_secret=False))
    db.commit()


def _pop_session(db, key: str) -> str | None:
    setting = db.scalar(select(Setting).where(Setting.key == key))
    if not setting:
        return None
    value = setting.value
    db.delete(setting)
    db.commit()
    return value


def set_edit_session(db, manager_id: str, approval_id: int) -> None:
    _set_session(db, f"telegram_edit_session:{manager_id}", str(approval_id))


def pop_edit_session(db, manager_id: str) -> int | None:
    value = _pop_session(db, f"telegram_edit_session:{manager_id}")
    return int(value) if value else None


def set_ai_edit_session(db, manager_id: str, approval_id: int) -> None:
    _set_session(db, f"telegram_ai_edit_session:{manager_id}", str(approval_id))


def pop_ai_edit_session(db, manager_id: str) -> int | None:
    value = _pop_session(db, f"telegram_ai_edit_session:{manager_id}")
    return int(value) if value else None


def set_edit_prompt_msg(db, manager_id: str, message_id: int) -> None:
    _set_session(db, f"telegram_edit_prompt_msg:{manager_id}", str(message_id))


def pop_edit_prompt_msg(db, manager_id: str) -> int | None:
    value = _pop_session(db, f"telegram_edit_prompt_msg:{manager_id}")
    return int(value) if value else None


def set_claim(db, approval_id: int, manager_id: str, manager_name: str = "") -> None:
    payload = f"{manager_id}\x00{manager_name}" if manager_name else manager_id
    _set_session(db, f"claimed:{approval_id}", payload)


def get_claim(db, approval_id: int) -> tuple[str, str] | None:
    value = _get_session(db, f"claimed:{approval_id}")
    if not value:
        return None
    if "\x00" in value:
        mid, name = value.split("\x00", 1)
        return mid, name
    return value, ""


def clear_claim(db, approval_id: int) -> None:
    _pop_session(db, f"claimed:{approval_id}")


def apply_ai_edited_reply(db, approval_id: int, manager_id: str, edit_prompt: str) -> ApprovalRequest | None:
    approval = db.get(ApprovalRequest, approval_id)
    if not approval:
        return None
    lead = db.get(Lead, approval.lead_id)
    original = approval.edited_reply or approval.ai_reply
    result = ai_edit_reply(original, approval.client_message, edit_prompt)
    new_reply = str(result.content)
    save_ai_usage(db, approval.lead_id, result)
    approval.edited_reply = new_reply
    approval.status = "edited"
    approval.manager_telegram_id = manager_id
    db.commit()
    if lead:
        move_lead_status(db, lead, settings.amocrm_status_on_edit, "approval_ai_edited")
    log_action(
        db,
        approval.lead_id,
        "telegram.approval_ai_edited",
        "success",
        {"approval_id": approval_id, "edit_prompt": edit_prompt, "new_reply": new_reply},
    )
    return approval


def _update_card_or_notify(approval: ApprovalRequest, lead: Lead, decision: str) -> None:
    try:
        if approval.telegram_message_id:
            telegram.edit_approval_card(approval, lead, decision=decision)
        else:
            telegram.send_text(
                settings.telegram_manager_chat_id,
                f"{decision} — Lead {lead.amocrm_lead_id}",
            )
    except Exception:
        pass


def approve_request(db, approval_id: int, manager_id: str) -> bool:
    approval = db.get(ApprovalRequest, approval_id)
    if not approval or approval.status in {"sent", "approved"}:
        return False
    lead = db.get(Lead, approval.lead_id)
    if not lead:
        return False

    approval.status = "approved"
    approval.manager_telegram_id = manager_id
    approval.approved_at = datetime.now(ZoneInfo(settings.timezone))
    db.commit()
    clear_claim(db, approval_id)
    move_lead_status(db, lead, settings.amocrm_status_on_approve, "approval_accepted")

    latest_user_message = db.scalar(
        select(Message)
        .where(Message.lead_id == lead.id, Message.role == "user")
        .order_by(Message.created_at.desc())
        .limit(1)
    )
    ok = False
    if latest_user_message:
        ok = send_approved_reply(
            db,
            lead,
            latest_user_message.conversation_id,
            str(approval.id),
            approval.edited_reply or approval.ai_reply,
            approval.extracted_fields,
            approval,
        )
        if ok:
            save_training_example(db, approval)

    _update_card_or_notify(approval, lead, "✅ Принято")
    return ok


def save_training_example(db, approval: ApprovalRequest) -> None:
    existing = db.scalar(
        select(TrainingExample).where(TrainingExample.approval_request_id == approval.id)
    )
    if existing:
        return
    final_reply = approval.edited_reply or approval.ai_reply
    db.add(
        TrainingExample(
            approval_request_id=approval.id,
            lead_id=approval.lead_id,
            client_message=approval.client_message,
            ai_reply=approval.ai_reply,
            final_reply=final_reply,
            was_edited=bool(approval.edited_reply),
            manager_telegram_id=approval.manager_telegram_id,
            amocrm_stage_name=approval.amocrm_stage_name,
            extracted_fields=approval.extracted_fields,
            quality_label="accepted",
        )
    )
    db.commit()
    log_action(
        db,
        approval.lead_id,
        "training.example_saved",
        "success",
        {
            "approval_id": approval.id,
            "was_edited": bool(approval.edited_reply),
            "quality_label": "accepted",
        },
    )


def reject_request(db, approval_id: int, manager_id: str) -> bool:
    approval = db.get(ApprovalRequest, approval_id)
    if not approval:
        return False
    approval.status = "rejected"
    approval.manager_telegram_id = manager_id
    db.commit()
    clear_claim(db, approval_id)
    lead = db.get(Lead, approval.lead_id)
    if lead:
        move_lead_status(db, lead, settings.amocrm_status_on_reject, "approval_rejected")
        _update_card_or_notify(approval, lead, "❌ Отклонено")
    log_action(db, approval.lead_id, "telegram.approval_rejected", "success", {"approval_id": approval_id})
    return True


def save_request(db, approval_id: int, manager_id: str) -> bool:
    approval = db.get(ApprovalRequest, approval_id)
    if not approval:
        return False
    approval.status = "saved"
    approval.manager_telegram_id = manager_id
    db.commit()
    lead = db.get(Lead, approval.lead_id)
    if lead:
        move_lead_status(db, lead, settings.amocrm_status_on_save, "approval_saved_unsorted")
        _update_card_or_notify(approval, lead, "💾 Сохранено")
    log_action(db, approval.lead_id, "telegram.approval_saved", "success", {"approval_id": approval_id})
    return True


def apply_edited_reply(db, approval_id: int, manager_id: str, text: str) -> ApprovalRequest | None:
    approval = db.get(ApprovalRequest, approval_id)
    if not approval:
        return None
    approval.edited_reply = text
    approval.status = "edited"
    approval.manager_telegram_id = manager_id
    db.commit()
    lead = db.get(Lead, approval.lead_id)
    if lead:
        move_lead_status(db, lead, settings.amocrm_status_on_edit, "approval_edited")
    log_action(
        db,
        approval.lead_id,
        "telegram.approval_edited",
        "success",
        {"approval_id": approval_id, "edited_reply": text},
    )
    return approval
