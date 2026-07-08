import io
import json
import logging
import re
from time import perf_counter

import httpx
from openai import BadRequestError, OpenAI
from pydantic import BaseModel
from tenacity import retry, stop_after_attempt, wait_exponential

from app.core.config import settings
from app.services.prompts import (
    EXTRACTOR_SYSTEM_PROMPT,
    SALES_AGENT_SYSTEM_PROMPT,
    SALES_INTENT_SYSTEM_PROMPT,
)

_log = logging.getLogger(__name__)

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


def _result(
    content: str | dict,
    model: str,
    purpose: str,
    usage: dict,
    latency_ms: int,
    input_cost_per_1m: float | None = None,
    output_cost_per_1m: float | None = None,
) -> AIResult:
    prompt_tokens = int(usage.get("prompt_tokens") or 0)
    completion_tokens = int(usage.get("completion_tokens") or 0)
    _in = input_cost_per_1m if input_cost_per_1m is not None else settings.openai_input_cost_per_1m_tokens
    _out = output_cost_per_1m if output_cost_per_1m is not None else settings.openai_output_cost_per_1m_tokens
    input_cost = prompt_tokens / 1_000_000 * _in
    output_cost = completion_tokens / 1_000_000 * _out
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


def _download_images_as_data_urls(urls: list[str], limit: int = 3) -> list[str]:
    """Download images ourselves and return base64 data URLs.

    amoCRM drive links are not publicly accessible, so OpenAI cannot fetch
    them server-side (returns 400). Downloading and inlining as base64
    avoids that. Images that fail to download are skipped.
    """
    import base64

    data_urls: list[str] = []
    with httpx.Client(timeout=15, follow_redirects=True) as client:
        for url in urls[-limit:]:
            try:
                resp = client.get(url)
                if not resp.is_success or not resp.content:
                    _log.warning("image download failed url=%.80s status=%s", url, resp.status_code)
                    continue
                content_type = resp.headers.get("content-type", "image/jpeg").split(";")[0].strip()
                if not content_type.startswith("image/"):
                    content_type = "image/jpeg"
                encoded = base64.b64encode(resp.content).decode()
                data_urls.append(f"data:{content_type};base64,{encoded}")
            except Exception as exc:
                _log.warning("image download error url=%.80s: %s", url, exc)
    return data_urls


def _clean_dialogue(dialogue: list[dict]) -> list[dict]:
    cleaned = []
    for msg in dialogue:
        content = _PICTURE_RE.sub("[клиент прислал фото]", msg.get("content", ""))
        cleaned.append({"role": msg["role"], "content": content})
    return cleaned


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=10))
def generate_reply(
    dialogue: list[dict],
    slot_context: dict,
    system_prompt: str | None = None,
    memory_context: str | None = None,
    use_sales_model: bool = False,
    model_override: str | None = None,
) -> AIResult:
    _model = model_override or (settings.openai_model_sales if use_sales_model else settings.openai_model_simple)
    _in_cost = settings.openai_input_cost_sales if use_sales_model else settings.openai_input_cost_simple
    _out_cost = settings.openai_output_cost_sales if use_sales_model else settings.openai_output_cost_simple
    if not settings.openai_api_key:
        return AIResult(
            content="Здравствуйте 👋 Подскажите, пожалуйста, что сейчас беспокоит вашу кожу?",
            model=_model,
            purpose="sales_agent",
        )
    started = perf_counter()

    image_urls = _extract_image_urls(dialogue)
    cleaned = _clean_dialogue(dialogue)

    # Build context header injected into every request regardless of system prompt
    now_bk = slot_context.get("now_bishkek", "")
    is_working = slot_context.get("is_working_hours", True)
    minutes_since = slot_context.get("minutes_since_last_message", 9999)

    time_note = f"[СИСТЕМНОЕ ВРЕМЯ БИШКЕК: {now_bk} {slot_context.get('date_bishkek', '')}]\n"

    if minutes_since <= 60:
        time_note += "[НЕ ПРИВЕТСТВУЙ — диалог продолжается, прошло менее 60 минут с последнего сообщения клиента.]\n"
    else:
        time_note += "[ПРИВЕТСТВИЕ: если диалог начался только что (нет предыдущих ответов ассистента) — поздоровайся «Здравствуйте» один раз. Если ассистент уже отвечал — не приветствуй снова.]\n"

    if not is_working:
        time_note += "[НЕРАБОЧЕЕ ВРЕМЯ. ОБЯЗАТЕЛЬНО: в начале ответа сообщи что магазин работает с 10:00 до 21:00. НЕ предлагай запись на консультацию.]\n"
        # Clear free slots so model cannot offer a specific time
        slot_context = {**slot_context, "free_slots": []}
    client_lang = slot_context.get("client_language", "ru")
    if client_lang and client_lang != "ru":
        _lang_names = {"ky": "кыргызском", "kz": "казахском", "en": "английском", "tr": "турецком", "uz": "узбекском", "de": "немецком", "fr": "французском", "zh": "китайском"}
        lang_label = _lang_names.get(client_lang, client_lang)
        time_note += f"[ЯЗЫК КЛИЕНТА: {lang_label} ({client_lang}). СТРОГО ОБЯЗАТЕЛЬНО: пиши ответ ТОЛЬКО на {lang_label} языке. Никакого русского!]\n"

    context_text = time_note + json.dumps(
        {"dialogue": cleaned, "check_consultation_slots": slot_context},
        ensure_ascii=False,
    )

    data_urls = _download_images_as_data_urls(image_urls) if image_urls else []
    if data_urls:
        content: list[dict] = [{"type": "image_url", "image_url": {"url": url}} for url in data_urls]
        content.append({"type": "text", "text": context_text})
        user_message: dict = {"role": "user", "content": content}
    else:
        user_message = {"role": "user", "content": context_text}

    _base_prompt = system_prompt or SALES_AGENT_SYSTEM_PROMPT
    if memory_context and memory_context.strip():
        _base_prompt = _base_prompt + "\n\n---\nПАМЯТЬ МАГАЗИНА (используй эти данные при ответах):\n" + memory_context.strip()
    try:
        response = _client().chat.completions.create(
            model=_model,
            temperature=0.5,
            messages=[
                {"role": "system", "content": _base_prompt},
                user_message,
            ],
        )
    except BadRequestError:
        if not data_urls:
            raise
        # Images rejected by the API — retry text-only so the client still gets a reply
        _log.warning("generate_reply 400 with images, retrying text-only")
        response = _client().chat.completions.create(
            model=_model,
            temperature=0.5,
            messages=[
                {"role": "system", "content": _base_prompt},
                {"role": "user", "content": context_text},
            ],
        )
    latency_ms = int((perf_counter() - started) * 1000)
    return _result(
        content=(response.choices[0].message.content or "").strip(),
        model=_model,
        purpose="sales_agent",
        usage=_usage_payload(response),
        latency_ms=latency_ms,
        input_cost_per_1m=_in_cost,
        output_cost_per_1m=_out_cost,
    )


def summarize_dialogue(dialogue: list[dict]) -> tuple[str, AIResult | None]:
    """Generate a brief hypervisor summary of the full conversation for managers."""
    if not dialogue:
        return "", None
    if not settings.openai_api_key:
        return "", None
    try:
        text = "\n".join(
            f"{'Клиент' if m['role'] == 'user' else 'Бот'}: {str(m.get('content', ''))[:300]}"
            for m in dialogue
        )
        t0 = perf_counter()
        response = _client().chat.completions.create(
            model=settings.openai_extractor_model,
            temperature=0,
            messages=[
                {"role": "system", "content": (
                    "Ты — помощник менеджера. Прочитай диалог и напиши краткое резюме для менеджера в 2-3 предложениях. "
                    "Укажи: что беспокоит клиента, на каком этапе разговор, было ли уже предложено что-то. "
                    "Пиши по-русски, кратко и по делу."
                )},
                {"role": "user", "content": text},
            ],
        )
        latency_ms = int((perf_counter() - t0) * 1000)
        result = _result(
            response.choices[0].message.content or "",
            model=settings.openai_extractor_model,
            purpose="hypervisor",
            usage=_usage_payload(response),
            latency_ms=latency_ms,
            input_cost_per_1m=settings.openai_input_cost_extractor,
            output_cost_per_1m=settings.openai_output_cost_extractor,
        )
        return result.content.strip(), result
    except Exception:
        return "", None


def detect_language(text: str) -> str:
    """Return ISO 639-1 language code for text (e.g. 'ru', 'ky', 'en'). Defaults to 'ru' on error."""
    if not settings.openai_api_key or not text.strip():
        return "ru"
    try:
        response = _client().chat.completions.create(
            model=settings.openai_extractor_model,
            temperature=0,
            messages=[
                {"role": "system", "content": (
                    "Определи язык текста. Ответь ТОЛЬКО кодом языка ISO 639-1, без пробелов и пояснений. "
                    "Примеры: ru, ky, kz, en, tr, uz, de, fr, zh. "
                    "ВАЖНО: кыргызский — ky, казахский — kz; они пишутся кириллицей, но это НЕ русский (ru)."
                )},
                {"role": "user", "content": text[:400]},
            ],
        )
        code = (response.choices[0].message.content or "ru").strip().lower()
        return code[:5] if code else "ru"
    except Exception:
        return "ru"


def detect_and_translate(client_message: str, ai_reply: str) -> dict[str, str | None]:
    """Detect client message language. If not Russian, return Russian translations of both texts."""
    if not settings.openai_api_key:
        return {"client_translation": None, "ai_reply_translation": None}
    try:
        response = _client().chat.completions.create(
            model=settings.openai_extractor_model,
            temperature=0,
            messages=[
                {"role": "system", "content": (
                    "Определи язык сообщения клиента. "
                    "ВАЖНО: кыргызский и казахский — это НЕ русский, даже если написаны кириллицей. "
                    "Если язык НЕ русский — переведи оба текста на русский язык. "
                    "Ответь строго JSON: "
                    "{\"is_russian\": true|false, \"client\": null|\"перевод\", \"reply\": null|\"перевод\"}. "
                    "Если русский: client=null, reply=null."
                )},
                {"role": "user", "content": (
                    f"Сообщение клиента:\n{client_message[:600]}\n\n"
                    f"Ответ бота:\n{ai_reply[:600]}"
                )},
            ],
        )
        raw = (response.choices[0].message.content or "").strip()
        data = json.loads(raw)
        if data.get("is_russian", True):
            return {"client_translation": None, "ai_reply_translation": None}
        return {
            "client_translation": str(data.get("client") or "").strip() or None,
            "ai_reply_translation": str(data.get("reply") or "").strip() or None,
        }
    except Exception:
        return {"client_translation": None, "ai_reply_translation": None}


def _deepseek_client() -> OpenAI:
    return OpenAI(api_key=settings.deepseek_api_key, base_url="https://api.deepseek.com/v1")


def call_gemini(model: str, messages: list[dict], temperature: float = 0.5) -> tuple[str, dict]:
    """Call Google's Generative Language API directly over REST (no extra SDK dependency).

    `messages` uses the same OpenAI-style shape the Laboratory tester already builds
    (role: system/user/assistant, content: str or list of content parts). Returns
    (reply_text, usage) where usage has prompt_tokens/completion_tokens/total_tokens.
    """
    if not settings.gemini_api_key:
        return "Здравствуйте 👋 (Gemini API key не настроен)", {}

    system_text = ""
    contents: list[dict] = []
    for msg in messages:
        role = msg.get("role")
        content = msg.get("content")
        if role == "system":
            system_text = content if isinstance(content, str) else str(content)
            continue
        parts: list[dict] = []
        if isinstance(content, str):
            parts.append({"text": content})
        elif isinstance(content, list):
            for block in content:
                if block.get("type") == "text":
                    parts.append({"text": block.get("text", "")})
                elif block.get("type") == "image_url":
                    url = block.get("image_url", {}).get("url", "")
                    if url.startswith("data:"):
                        header, _, b64data = url.partition(",")
                        mime = header.split(";")[0].replace("data:", "") or "image/jpeg"
                        parts.append({"inline_data": {"mime_type": mime, "data": b64data}})
        contents.append({"role": "model" if role == "assistant" else "user", "parts": parts})

    body: dict = {"contents": contents, "generationConfig": {"temperature": temperature}}
    if system_text:
        body["systemInstruction"] = {"parts": [{"text": system_text}]}

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    with httpx.Client(timeout=60) as client:
        resp = client.post(url, params={"key": settings.gemini_api_key}, json=body)
        resp.raise_for_status()
        data = resp.json()

    text = ""
    candidates = data.get("candidates") or []
    if candidates:
        for part in candidates[0].get("content", {}).get("parts", []):
            text += part.get("text", "")
    usage_meta = data.get("usageMetadata", {})
    usage = {
        "prompt_tokens": usage_meta.get("promptTokenCount", 0),
        "completion_tokens": usage_meta.get("candidatesTokenCount", 0),
        "total_tokens": usage_meta.get("totalTokenCount", 0),
    }
    return text.strip(), usage


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=10))
def classify_sales_intent(dialogue: list[dict], latest_message: str) -> AIResult:
    fallback = {"is_sales": True, "is_complex": True, "reason": "no_key"}
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
        content["is_complex"] = bool(content.get("is_complex", True))
        return _result(content=content, model=settings.openai_extractor_model,
                       purpose="sales_intent", usage=_usage_payload(response), latency_ms=latency_ms,
                       input_cost_per_1m=settings.openai_input_cost_extractor,
                       output_cost_per_1m=settings.openai_output_cost_extractor)

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
    return _result(
        content=content,
        model=model,
        purpose="sales_intent",
        usage=_usage_payload(response),
        latency_ms=latency_ms,
        input_cost_per_1m=settings.deepseek_input_cost_per_1m,
        output_cost_per_1m=settings.deepseek_output_cost_per_1m,
    )


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=10))
def extract_fields(dialogue: list[dict], contacts: str | None) -> AIResult:
    empty = {
        "skin_problem": [],
        "age": None,
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
        input_cost_per_1m=settings.openai_input_cost_extractor,
        output_cost_per_1m=settings.openai_output_cost_extractor,
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
        model=settings.openai_model_sales,
        temperature=0.4,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
    )
    latency_ms = int((perf_counter() - started) * 1000)
    return _result(
        content=(response.choices[0].message.content or "").strip(),
        model=settings.openai_model_sales,
        purpose="ai_edit",
        usage=_usage_payload(response),
        latency_ms=latency_ms,
        input_cost_per_1m=settings.openai_input_cost_sales,
        output_cost_per_1m=settings.openai_output_cost_sales,
    )


_LANGUAGE_ALIASES = {
    "ru": "русский",
    "rus": "русский",
    "russian": "русский",
    "рус": "русский",
    "русский": "русский",
    "ru-ru": "русский",
    "ky": "кыргызский",
    "kg": "кыргызский",
    "kyrgyz": "кыргызский",
    "kyrgyzstan": "кыргызский",
    "кыргыз": "кыргызский",
    "кыргызский": "кыргызский",
    "киргизский": "кыргызский",
    "киргиз": "кыргызский",
    "en": "английский",
    "eng": "английский",
    "english": "английский",
    "англ": "английский",
    "английский": "английский",
    "kz": "казахский",
    "kk": "казахский",
    "kazakh": "казахский",
    "казахский": "казахский",
    "uz": "узбекский",
    "uzbek": "узбекский",
    "узбекский": "узбекский",
    "tr": "турецкий",
    "turkish": "турецкий",
    "турецкий": "турецкий",
}


def normalize_target_language(language: str) -> str:
    cleaned = re.sub(r"\s+", " ", (language or "").strip().lower())
    cleaned = cleaned.strip(" .,!?:;\"'")
    return _LANGUAGE_ALIASES.get(cleaned, cleaned or "русский")


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=10))
def translate_reply(original_reply: str, client_message: str, target_language: str) -> AIResult:
    language = normalize_target_language(target_language)
    if not settings.openai_api_key:
        return AIResult(content=original_reply, model=settings.openai_model, purpose="translate_reply")
    started = perf_counter()
    system = (
        "Ты профессионально переводишь сообщения менеджера магазина косметики. "
        "Переведи ответ на целевой язык. Сохрани смысл, дружелюбный тон, обращения, числа, цены, "
        "названия брендов, ссылки, телефоны и переносы строк. Не добавляй новые обещания и факты. "
        "Верни ТОЛЬКО переведенный текст, без комментариев, кавычек и пояснений."
    )
    user = (
        f"Целевой язык: {language}\n\n"
        f"Сообщение клиента для контекста:\n{client_message or '-'}\n\n"
        f"Ответ для перевода:\n{original_reply}"
    )
    response = _client().chat.completions.create(
        model=settings.openai_model_sales,
        temperature=0.1,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
    )
    latency_ms = int((perf_counter() - started) * 1000)
    return _result(
        content=(response.choices[0].message.content or "").strip(),
        model=settings.openai_model_sales,
        purpose="translate_reply",
        usage=_usage_payload(response),
        latency_ms=latency_ms,
        input_cost_per_1m=settings.openai_input_cost_sales,
        output_cost_per_1m=settings.openai_output_cost_sales,
    )


def explain_reply(client_message: str, reply: str, conversation_summary: str | None = None) -> AIResult:
    """Explain briefly why the bot answered the way it did (for managers)."""
    if not settings.openai_api_key:
        return AIResult(content="", model=settings.openai_extractor_model, purpose="explain_reply")
    started = perf_counter()
    system = (
        "Ты — AI-ассистент Айым магазина косметики Demi Results, объясняющий менеджеру логику своего ответа. "
        "Тебе дают сообщение клиента и твой ответ. Объясни КРАТКО (2-4 строки, от первого лица) почему ты ответила именно так: "
        "какую цель преследовал ответ, почему задан этот вопрос или предложена консультация. "
        "Пиши просто и по делу, на русском. Без вступлений и заключений."
    )
    user = f"Сообщение клиента:\n{client_message}\n\nМой ответ:\n{reply}"
    if conversation_summary:
        user = f"Контекст диалога:\n{conversation_summary}\n\n{user}"
    response = _client().chat.completions.create(
        model=settings.openai_extractor_model,
        temperature=0.3,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
    )
    latency_ms = int((perf_counter() - started) * 1000)
    return _result(
        content=(response.choices[0].message.content or "").strip(),
        model=settings.openai_extractor_model,
        purpose="explain_reply",
        usage=_usage_payload(response),
        latency_ms=latency_ms,
        input_cost_per_1m=settings.openai_input_cost_extractor,
        output_cost_per_1m=settings.openai_output_cost_extractor,
    )


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=10))
def analyze_manager_corrections(examples: list[dict]) -> AIResult:
    """Group manager edits of bot drafts into common mistake patterns for the Laboratory analysis tool."""
    if not settings.openai_api_key:
        return AIResult(content={"categories": [], "suggested_prompt_changes": "", "expected_improvement": ""},
                         model=settings.openai_model_sales, purpose="mistake_analysis")
    started = perf_counter()
    system = (
        "Ты — аналитик качества AI-бота продаж. Тебе дают примеры диалогов, где менеджер исправил черновик "
        "бота перед отправкой клиенту: сообщение клиента (client_message), черновик бота (ai_reply) и то, что "
        "менеджер отправил в итоге (final_reply). Сравни ai_reply и final_reply в каждом примере, пойми ЧТО "
        "именно менеджер поменял и почему, и сгруппируй повторяющиеся типы ошибок бота в 3-6 категорий. "
        "Ответь строго JSON вида: "
        '{"categories": [{"label": "краткое название ошибки на русском", "count": число_примеров}], '
        '"suggested_prompt_changes": "конкретные формулировки для добавления в системный промпт бота", '
        '"expected_improvement": "честная экспертная оценка ожидаемого эффекта в свободной форме, '
        'явно как оценка, а не измеренная метрика"}'
    )
    response = _client().chat.completions.create(
        model=settings.openai_model_sales,
        temperature=0.2,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": json.dumps({"examples": examples}, ensure_ascii=False)},
        ],
    )
    latency_ms = int((perf_counter() - started) * 1000)
    data = json.loads(response.choices[0].message.content or "{}")
    data.setdefault("categories", [])
    data.setdefault("suggested_prompt_changes", "")
    data.setdefault("expected_improvement", "")
    return _result(
        content=data,
        model=settings.openai_model_sales,
        purpose="mistake_analysis",
        usage=_usage_payload(response),
        latency_ms=latency_ms,
        input_cost_per_1m=settings.openai_input_cost_sales,
        output_cost_per_1m=settings.openai_output_cost_sales,
    )


def transcribe_voice(url: str) -> tuple[str, str]:
    """Download audio from URL and transcribe with Whisper. Returns (text, lang_code like 'ru'/'ky')."""
    if not settings.openai_api_key:
        return "", "ru"
    auth_headers: dict = {}
    if settings.amocrm_access_token:
        auth_headers["Authorization"] = f"Bearer {settings.amocrm_access_token}"
    with httpx.Client(timeout=60, follow_redirects=True) as http:
        resp = http.get(url, headers=auth_headers)
        resp.raise_for_status()
        audio_bytes = resp.content
    filename = url.split("?")[0].rstrip("/").split("/")[-1] or "voice.ogg"
    if not any(filename.endswith(ext) for ext in (".mp3", ".mp4", ".ogg", ".wav", ".m4a", ".webm", ".mpeg", ".mpga")):
        filename = "voice.ogg"
    response = _client().audio.transcriptions.create(
        model="whisper-1",
        file=(filename, io.BytesIO(audio_bytes)),
        response_format="verbose_json",
    )
    text = (response.text or "").strip()
    lang = (getattr(response, "language", None) or "ru").lower()
    _lang_map = {"russian": "ru", "kyrgyz": "ky", "english": "en", "uzbek": "uz", "kazakh": "kk"}
    lang = _lang_map.get(lang, lang[:2])
    return text, lang
