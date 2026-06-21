import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

from app.api import admin, health, slots, webhooks
from app.api import auth as auth_router
from app.api import crm_users as crm_users_router
from app.core.admin_auth import admin_auth_middleware
from app.core.config import settings
from app.core.logging import configure_logging
from app.core.rate_limit import webhook_rate_limit_middleware

configure_logging()
log = logging.getLogger(__name__)

app = FastAPI(title=settings.api_title)
app.middleware("http")(webhook_rate_limit_middleware)
app.middleware("http")(admin_auth_middleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.cors_origins.split(",") if origin.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(health.router)
app.include_router(webhooks.router)
app.include_router(admin.router)
app.include_router(slots.router)
app.include_router(auth_router.router)
app.include_router(crm_users_router.router)


INITIAL_USERS = [
    {"username": "samat", "password": "SamaT-0303-crm", "is_admin": True},
    {"username": "alihan", "password": "AlihaN-0303-crm", "is_admin": True},
]


@app.on_event("startup")
def seed_crm_users() -> None:
    from app.api.auth import hash_password
    from app.db.session import SessionLocal
    from app.models.entities import CrmUser

    db = SessionLocal()
    try:
        for u in INITIAL_USERS:
            exists = db.scalars(select(CrmUser).where(CrmUser.username == u["username"])).first()
            if not exists:
                db.add(CrmUser(
                    username=u["username"],
                    password_hash=hash_password(u["password"]),
                    is_admin=u["is_admin"],
                ))
                log.info("Seeded CRM user: %s", u["username"])
        db.commit()
    except Exception as e:
        log.warning("CRM user seed failed (table may not exist yet): %s", e)
        db.rollback()
    finally:
        db.close()
