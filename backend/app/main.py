from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import admin, health, slots, webhooks
from app.core.admin_auth import admin_auth_middleware
from app.core.config import settings
from app.core.logging import configure_logging
from app.core.rate_limit import webhook_rate_limit_middleware

configure_logging()

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
