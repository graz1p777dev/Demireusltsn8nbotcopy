from celery import Celery
from celery.schedules import crontab

from app.core.config import settings

celery_app = Celery("demi_results_bot", broker=settings.redis_url, backend=settings.redis_url)
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone=settings.timezone,
    enable_utc=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    beat_schedule={
        # 10:00 Bishkek (UTC+6) = 04:00 UTC
        "daily-consultation-reminders": {
            "task": "app.tasks.reminders.send_daily_consultation_reminders",
            "schedule": crontab(hour=4, minute=0),
        },
        # Every 30 min — check who came
        "check-consultation-results": {
            "task": "app.tasks.reminders.check_consultation_results",
            "schedule": crontab(minute="*/30"),
        },
        # Every 5 min — remind managers about overdue pending approvals
        "check-overdue-approvals": {
            "task": "app.tasks.reminders.check_overdue_approvals",
            "schedule": crontab(minute="*/5"),
        },
    },
)
celery_app.autodiscover_tasks(["app.tasks.pipeline", "app.tasks.reminders"])

