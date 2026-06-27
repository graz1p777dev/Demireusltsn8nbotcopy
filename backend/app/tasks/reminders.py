import json
import logging
from datetime import datetime
from zoneinfo import ZoneInfo

from sqlalchemy import select

from app.core.config import settings
from app.db.session import SessionLocal
from app.models.entities import ConsultationReminder
from app.services import google_sheets, telegram
from app.tasks.celery_app import celery_app

_log = logging.getLogger(__name__)


@celery_app.task(name="app.tasks.reminders.send_daily_consultation_reminders")
def send_daily_consultation_reminders() -> dict:
    """Runs at 10:00 Bishkek. Sends a card to all managers for each today's consultation."""
    if not settings.google_sheets_enabled:
        return {"skipped": True, "reason": "sheets disabled"}

    today = datetime.now(ZoneInfo(settings.timezone)).strftime("%d.%m.%Y")
    consultations = google_sheets.get_todays_consultations()
    if not consultations:
        telegram.send_text_all_managers(
            f"📅 <b>Консультации на {today}</b>\n\nЗаписей нет."
        )
        return {"sent": 0, "date": today}

    # Send summary header
    telegram.send_text_all_managers(
        f"📅 <b>Консультации на сегодня ({today})</b>\n"
        f"Всего: {len(consultations)} запись(ей)"
    )

    db = SessionLocal()
    sent = 0
    try:
        for c in consultations:
            if c.get("reminder_sent") == "Да":
                continue

            # Check if we already created a DB record for this row
            existing = db.scalar(
                select(ConsultationReminder).where(
                    ConsultationReminder.sheet_name == c["sheet_name"],
                    ConsultationReminder.row_number == c["row_number"],
                )
            )
            if existing and existing.status != "pending":
                continue

            if not existing:
                reminder = ConsultationReminder(
                    sheet_name=c["sheet_name"],
                    row_number=c["row_number"],
                    consultation_date=c["date"],
                    consultation_time=c["time"],
                    client_name=c.get("name"),
                    client_phone=c.get("phone"),
                    lead_id_amo=c.get("lead_id"),
                    status="pending",
                )
                db.add(reminder)
                db.flush()
            else:
                reminder = existing

            # Send individual card
            message_ids = telegram.send_consultation_reminder_card(c, reminder.id)
            if message_ids:
                reminder.telegram_message_ids = json.dumps(message_ids)
                google_sheets.mark_reminder_sent(c["sheet_name"], c["row_number"])
                sent += 1

        db.commit()
    except Exception:
        db.rollback()
        _log.exception("Error in send_daily_consultation_reminders")
        raise
    finally:
        db.close()

    return {"sent": sent, "date": today}


@celery_app.task(name="app.tasks.reminders.check_consultation_results")
def check_consultation_results() -> dict:
    """Runs every 30 min. Sends follow-up cards for consultations that ended but have no result."""
    if not settings.google_sheets_enabled:
        return {"skipped": True}

    unresolved = google_sheets.get_past_consultations_without_result()
    if not unresolved:
        return {"checked": 0}

    db = SessionLocal()
    notified = 0
    try:
        for c in unresolved:
            existing = db.scalar(
                select(ConsultationReminder).where(
                    ConsultationReminder.sheet_name == c["sheet_name"],
                    ConsultationReminder.row_number == c["row_number"],
                )
            )
            if existing:
                if existing.status != "pending":
                    continue
                reminder = existing
            else:
                reminder = ConsultationReminder(
                    sheet_name=c["sheet_name"],
                    row_number=c["row_number"],
                    consultation_date=c["date"],
                    consultation_time=c["time"],
                    client_name=c.get("name"),
                    client_phone=c.get("phone"),
                    lead_id_amo=c.get("lead_id"),
                    status="pending",
                )
                db.add(reminder)
                db.flush()

            message_ids = telegram.send_consultation_reminder_card(c, reminder.id)
            if message_ids:
                reminder.telegram_message_ids = json.dumps(message_ids)
                notified += 1

        db.commit()
    except Exception:
        db.rollback()
        _log.exception("Error in check_consultation_results")
        raise
    finally:
        db.close()

    return {"notified": notified}
