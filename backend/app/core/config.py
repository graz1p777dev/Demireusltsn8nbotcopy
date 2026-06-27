from functools import lru_cache

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        env_ignore_empty=True,
        extra="ignore",
    )

    app_env: str = "production"
    api_title: str = "Demi Results AI Bot"
    database_url: str = "postgresql+psycopg://demi:demi@postgres:5432/demi_results"
    redis_url: str = "redis://redis:6379/0"
    cors_origins: str = "http://localhost:3000"
    webhook_rate_limit_per_minute: int = 120
    message_buffer_seconds: int = 10

    openai_api_key: str = ""
    openai_model: str = "gpt-4.1-mini"
    openai_extractor_model: str = "gpt-4.1-mini"
    deepseek_api_key: str = ""
    openai_input_cost_per_1m_tokens: float = 0
    openai_output_cost_per_1m_tokens: float = 0

    amocrm_base_url: str = "https://demicosmetics1.amocrm.ru"
    amocrm_access_token: str = ""
    amocrm_webhook_secret: str = ""
    amojo_base_url: str = "https://amojo.amocrm.ru"
    amocrm_ai_user_id: int = 0  # amoCRM user ID for "ИИ Агент" — assigned as responsible when bot takes a lead

    google_sheets_enabled: bool = False
    google_service_account_json: str = ""
    google_service_account_file: str = ""
    google_sheets_spreadsheet_id: str = ""

    timezone: str = "Asia/Bishkek"
    schedule_start_dates: str = "2026-05-19,2026-05-20"
    consultation_start_hour: int = 10
    consultation_end_hour: int = 21
    consultation_interval_minutes: int = 20
    do_not_offer_today_after_hour: int = 18

    admin_api_key: str = Field(default="", description="Optional API key for admin routes.")
    jwt_secret: str = Field(default="change-me-in-production", description="Secret for JWT signing.")
    human_approval_enabled: bool = True
    telegram_bot_token: str = ""
    telegram_manager_chat_id: str = ""
    telegram_extra_manager_chat_ids: str = ""
    telegram_allowed_manager_ids: str = ""
    telegram_webhook_secret: str = ""
    public_backend_url: str = ""
    amocrm_status_on_approve: int | None = None
    amocrm_status_on_edit: int | None = None
    amocrm_status_on_reject: int | None = None
    amocrm_status_on_save: int | None = None
    amocrm_status_primary_contact: int | None = None
    amocrm_status_qualified: int | None = None
    amocrm_status_consultation_scheduled: int | None = None
    amocrm_status_unsorted: int | None = None

    @field_validator("database_url")
    @classmethod
    def normalize_database_url(cls, value: str) -> str:
        if value.startswith("postgres://"):
            return value.replace("postgres://", "postgresql+psycopg://", 1)
        if value.startswith("postgresql://"):
            return value.replace("postgresql://", "postgresql+psycopg://", 1)
        return value


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
