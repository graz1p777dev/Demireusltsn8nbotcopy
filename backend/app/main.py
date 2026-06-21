import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select, text

from app.api import admin, health, slots, webhooks
from app.api import auth as auth_router
from app.api import crm_users as crm_users_router
from app.core.admin_auth import admin_auth_middleware
from app.core.config import settings
from app.core.logging import configure_logging
from app.core.rate_limit import webhook_rate_limit_middleware

configure_logging()
log = logging.getLogger(__name__)

INITIAL_USERS = [
    {"username": "samat", "password": "SamaT-0303-crm", "is_admin": True},
    {"username": "alihan", "password": "AlihaN-0303-crm", "is_admin": True},
]


def _setup_crm_users_sync() -> None:
    from app.api.auth import hash_password
    from app.db.session import SessionLocal, engine
    from app.models.entities import CrmUser

    try:
        with engine.connect() as conn:
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS crm_users (
                    id SERIAL PRIMARY KEY,
                    username VARCHAR(64) NOT NULL UNIQUE,
                    password_hash VARCHAR(255) NOT NULL,
                    is_admin BOOLEAN NOT NULL DEFAULT FALSE,
                    is_active BOOLEAN NOT NULL DEFAULT TRUE,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
            """))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_crm_users_username ON crm_users (username)"))
            conn.commit()
        log.info("crm_users table ready")
    except Exception as e:
        log.warning("Could not create crm_users table: %s", e)
        return

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
        log.warning("CRM user seed failed: %s", e)
        db.rollback()
    finally:
        db.close()


async def _setup_crm_users_bg() -> None:
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, _setup_crm_users_sync)


@asynccontextmanager
async def lifespan(app: FastAPI):
    asyncio.create_task(_setup_crm_users_bg())
    yield


app = FastAPI(title=settings.api_title, lifespan=lifespan)
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
