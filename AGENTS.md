# Demi Results — бэкенд бота · Гид для ИИ-агентов

Весь текст в общении и документации — на русском. Код, имена файлов, функции, SQL, env — на английском.

## Что это за репо

Python/FastAPI бэкенд AI-бота (amoCRM + Telegram human-in-the-loop + OpenAI/Gemini/DeepSeek). Полное описание — в [README.md](README.md).

Есть также `frontend/` (простая Next.js админка — **не используется пользователем**, см. ниже) и `inventory/` (отдельное Next.js-приложение товароучёта, Multi-Zones).

## Реальная CRM живёт в другом репо

Пользователь **не пользуется** `frontend/` из этого репо. Настоящий визуальный интерфейс (Дашборд, Сотрудники, Диалоги, Лаборатория и т.д.) — отдельный Next.js+Supabase проект `~/Desktop/DemiResultsCRM` (репо `graz1p777dev/DemiResultsCRM`). Он обращается к бэкенду из **этого** репо через прокси `/api/backend/*` (env `BOT_BACKEND_API_URL`).

**Полная карта инфраструктуры (Railway-аккаунты, домены, известные проблемы, что не закончено) — в [`~/Desktop/DemiResultsCRM/INFRASTRUCTURE.md`](../DemiResultsCRM/INFRASTRUCTURE.md).** Прочитать перед любой работой с деплоем — там нюансы, которые иначе придётся заново откапывать (два разных Railway-аккаунта под похожими названиями, домен `demiresultscrm-production.up.railway.app` — это НЕ CRM, а тестовый деплой этого же бэкенда, и т.д.)

## Ключевые факты (кратко, детали — в INFRASTRUCTURE.md выше)

- Реальный прод бэкенда: `https://api-demiresults.alihan-torebekov.kg` (Railway, аккаунт `graz1p@proton.me`, проект `scintillating-transformation`, сервис `Demireusltsn8nbotcopy`).
- Реальный прод БД: Postgres в том же проекте. Есть частично начатый (не завершённый) перенос на другой Railway-аккаунт (`gekkokurai@gmail.com`, проект `DemiResultsCRM`) — прод НЕ переключён туда, старое остаётся источником правды.
- Локальная разработка — `docker-compose.yml` (Postgres, Redis, backend, worker, beat, frontend, автобэкапы).
- Деплой на свой VPS — уже готов: `setup.sh` (полный provision чистого Ubuntu) + `DEPLOY.md` + `deploy/backup_now.sh` + `deploy/restore.sh`. Проверен на синтаксис, не прогонялся вживую на реальном сервере.
- Пользователь (2026-07-09) сказал, что настраивает свой VPS — вероятно, миграция с Railway на self-hosted произойдёт в ближайшее время. Если так — незавершённый перенос на аккаунт `gekkokurai@gmail.com` (см. выше), скорее всего, не нужен.

## Модели ИИ

`/admin/ai-test` (и Лаборатория в CRM) поддерживает три провайдера, маршрутизация по имени модели в `backend/app/api/admin.py` (`_GEMINI_MODELS`, `_DEEPSEEK_API_MODEL`):
- OpenAI — напрямую.
- Gemini — REST-вызов без SDK (`call_gemini` в `openai_service.py`), нужен `GEMINI_API_KEY`.
- DeepSeek — через `_deepseek_client()` (OpenAI-совместимый API), нужен `DEEPSEEK_API_KEY`. Модели `deepseek-v3.2`/`deepseek-v4-pro` в каталоге — это отображаемые названия, реальный API id — `deepseek-chat` (единственный подтверждённо рабочий в этом проекте); `deepseek-reasoner` — отдельная реальная модель.

## Осторожно с секретами

При просмотре env-переменных Railway никогда не используй `cut -d=` / `grep` вслепую на многострочных значениях (например `GOOGLE_SERVICE_ACCOUNT_JSON` с `private_key` внутри) — такие фильтры пропускают строки без `=` без изменений и печатают секрет целиком. Всегда сохраняй в файл и печатай только имена ключей через `grep -E "^[A-Z][A-Z0-9_]*="`, либо маскируй значения (`sed -E 's/=.*/=***/'`).
