import json
import re
from time import perf_counter

from openai import OpenAI
from pydantic import BaseModel
from tenacity import retry, stop_after_attempt, wait_exponential

from app.core.config import settings
from app.services.prompts import EXTRACTOR_SYSTEM_PROMPT, SALES_AGENT_SYSTEM_PROMPT, SALES_INTENT_SYSTEM_PROMPT

_PICTURE_RE = re.compile(r'\[picture\]\s*(https?://\S+)')


class AIResult(BaseModel):
    content: str | dict
    model: str
    purpose: str
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0
    input_cost: float = 0
    output_cost: float = 0
    total_cost: float = 0
    latency_ms: int | None = None
    raw_usage: dict | None = None


def _client() -> OpenAI:
    return OpenAI(api_key=settings.openai_api_key)


def _usage_payload(response) -> dict:
    usage = getattr(response, "usage", None)
    if not usage:
        return {}
    if hasattr(usage, "model_dump"):
        return usage.model_dump()
    return dict(usage)


def _result(content: str | dict, model: str, purpose: str, usage: dict, latency_ms: int) -> AIResult:
    prompt_tokens = int(usage.get("prompt_tokens") or 0)
    completion_tokens = int(usage.get("completion_tokens") or 0)
    input_cost = prompt_tokens / 1_000_000 * settings.openai_input_cost_per_1m_tokens
    output_cost = completion_tokens / 1_000_000 * settings.openai_output_cost_per_1m_tokens
    return AIResult(
        content=content,
        model=model,
        purpose=purpose,
        prompt_tokens=prompt_tokens,
        completion_tokens=completion_tokens,
        total_tokens=int(usage.get("total_tokens") or prompt_tokens + completion_tokens),
        input_cost=round(input_cost, 8),
        output_cost=round(output_cost, 8),
        total_cost=round(input_cost + output_cost, 8),
        latency_ms=latency_ms,
        raw_usage=usage or None,
    )


def _extract_image_urls(dialogue: list[dict]) -> list[str]:
    urls = []
    for msg in dialogue:
        if msg.get("role") == "user":
            for m in _PICTURE_RE.finditer(msg.get("content", "")):
                urls.append(m.group(1))
    return urls


def _clean_dialogue(dialogue: list[dict]) -> list[dict]:
    cleaned = []
    for msg in dialogue:
        content = _PICTURE_RE.sub("[клиент прислал фото]", msg.get("content", ""))
        cleaned.append({"role": msg["role"], "content": content})
    return cleaned


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=10))
def generate_reply(dialogue: list[dict], slot_context: dict, system_prompt: str | None = None) -> AIResult:
    if not settings.openai_api_key:
        return AIResult(
            content="Здравствуйте 👋 Подскажите, пожалуйста, что сейчас беспокоит вашу кожу?",
            model=settings.openai_model,
            purpose="sales_agent",
        )
    started = perf_counter()

    image_urls = _extract_image_urls(dialogue)
    cleaned = _clean_dialogue(dialogue)
    context_text = json.dumps(
        {"dialogue": cleaned, "check_consultation_slots": slot_context},
        ensure_ascii=False,
    )

    if image_urls:
        content: list[dict] = [{"type": "image_url", "image_url": {"url": url}} for url in image_urls]
        content.append({"type": "text", "text": context_text})
        user_message: dict = {"role": "user", "content": content}
    else:
        user_message = {"role": "user", "content": context_text}

    response = _client().chat.completions.create(
        model=settings.openai_model,
        temperature=0.5,
        messages=[
            {"role": "system", "content": system_prompt or SALES_AGENT_SYSTEM_PROMPT},
            user_message,
        ],
    )
    latency_ms = int((perf_counter() - started) * 1000)
    return _result(
        content=(response.choices[0].message.content or "").strip(),
        model=settings.openai_model,
        purpose="sales_agent",
        usage=_usage_payload(response),
        latency_ms=latency_ms,
    )


def _deepseek_client() -> OpenAI:
    return OpenAI(api_key=settings.deepseek_api_key, base_url="https://api.deepseek.com/v1")


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=10))
def classify_sales_intent(dialogue: list[dict], latest_message: str) -> AIResult:
    fallback = {"is_sales": True, "reason": "no_key"}
    model = "deepseek-chat"

    if not settings.deepseek_api_key:
        # fallback to openai if deepseek not configured
        if not settings.openai_api_key:
            return AIResult(content=fallback, model=model, purpose="sales_intent")
        started = perf_counter()
        response = _client().chat.completions.create(
            model=settings.openai_extractor_model,
            temperature=0,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": SALES_INTENT_SYSTEM_PROMPT},
                {"role": "user", "content": json.dumps(
                    {"dialogue": dialogue[-20:], "latest_message": latest_message},
                    ensure_ascii=False,
                )},
            ],
        )
        latency_ms = int((perf_counter() - started) * 1000)
        content = fallback | json.loads(response.choices[0].message.content or "{}")
        content["is_sales"] = bool(content.get("is_sales"))
        return _result(content=content, model=settings.openai_extractor_model,
                       purpose="sales_intent", usage=_usage_payload(response), latency_ms=latency_ms)

    started = perf_counter()
    response = _deepseek_client().chat.completions.create(
        model=model,
        temperature=0,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": SALES_INTENT_SYSTEM_PROMPT},
            {"role": "user", "content": json.dumps(
                {"dialogue": dialogue[-20:], "latest_message": latest_message},
                ensure_ascii=False,
            )},
        ],
    )
    latency_ms = int((perf_counter() - started) * 1000)
    content = fallback | json.loads(response.choices[0].message.content or "{}")
    content["is_sales"] = bool(content.get("is_sales"))
    return AIResult(
        content=content,
        model=model,
        purpose="sales_intent",
        usage=_usage_payload(response),
        latency_ms=latency_ms,
    )


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=10))
def extract_fields(dialogue: list[dict], contacts: str | None) -> AIResult:
    empty = {
        "skin_problem": [],
        "consultation_format": None,
        "city": None,
        "experience": None,
        "consultation_confirmed": False,
        "consultation_date": None,
        "consultation_time": None,
        "name": None,
        "contacts": None,
    }
    if not settings.openai_api_key:
        return AIResult(content=empty, model=settings.openai_extractor_model, purpose="lead_extractor")
    started = perf_counter()
    response = _client().chat.completions.create(
        model=settings.openai_extractor_model,
        temperature=0,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": EXTRACTOR_SYSTEM_PROMPT},
            {"role": "user", "content": json.dumps({"dialogue": dialogue, "contacts": contacts}, ensure_ascii=False)},
        ],
    )
    latency_ms = int((perf_counter() - started) * 1000)
    return _result(
        content=empty | json.loads(response.choices[0].message.content or "{}"),
        model=settings.openai_extractor_model,
        purpose="lead_extractor",
        usage=_usage_payload(response),
        latency_ms=latency_ms,
    )


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=10))
def ai_edit_reply(original_reply: str, client_message: str, edit_prompt: str) -> AIResult:
    if not settings.openai_api_key:
        return AIResult(content=original_reply, model=settings.openai_model, purpose="ai_edit")
    started = perf_counter()
    system = (
        "Ты редактируешь готовый ответ менеджера по продажам. "
        "Получаешь оригинальный ответ и инструкцию по его изменению. "
        "Верни ТОЛЬКО исправленный текст ответа — без комментариев, без кавычек, без пояснений. "
        "Сохраняй стиль и тон оригинала. Отвечай на том же языке что и оригинал."
    )
    user = (
        f"Сообщение клиента:\n{client_message}\n\n"
        f"Оригинальный ответ:\n{original_reply}\n\n"
        f"Инструкция по изменению:\n{edit_prompt}"
    )
    response = _client().chat.completions.create(
        model=settings.openai_model,
        temperature=0.4,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
    )
    latency_ms = int((perf_counter() - started) * 1000)
    return _result(
        content=(response.choices[0].message.content or "").strip(),
        model=settings.openai_model,
        purpose="ai_edit",
        usage=_usage_payload(response),
        latency_ms=latency_ms,
    )
