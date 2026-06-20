# Demi Results n8n Copy Project

Production-ready Python/Next.js replacement for the `DemiResults.json` n8n workflow.

## Что перенесено из n8n

- amoCRM webhook parsing: `lead_id`, `chat_id`, `client_name`, `message_id`, `contact_id`, `source`, `text`, timestamp, media/audio/picture fields.
- Idempotency по `message_id`.
- Буферизация сообщений на 10 секунд через Celery countdown и PostgreSQL `message_buffer`.
- Локальная память вместо Supabase: PostgreSQL таблицы `clients`, `leads`, `conversations`, `messages`, `message_buffer`, `client_memory`, `action_logs`, `ai_extracted_fields`, `consultation_slots`, `settings`.
- AI Sales Agent “Айым” с правилами из n8n: короткий теплый стиль, русский/кыргызский, запрет диагнозов/лечения/выдуманных цен/слотов.
- `check_consultation_slots`: 10:00-21:00, шаг 20 минут, график 2/2 с 19.05.2026 и 20.05.2026, не предлагать сегодня после 18:00.
- Отправка ответа в amoCRM через chat session token и amojo endpoint.
- AI extractor для JSON карточки.
- OpenAI token/cost accounting: `ai_usage` хранит model, purpose, prompt/completion/total tokens, latency и стоимость.
- amoCRM custom fields update с enum matching и timestamp по Бишкеку UTC+6.
- Google Sheets запись консультации по месячным листам из n8n.
- Админка: диалоги, чат, карточка клиента, память, action logs, errors, extracted fields, AI toggle, ручная отправка.
- Human-in-the-loop через Telegram: AI готовит черновик, менеджер принимает, редактирует или отклоняет.
- Training examples: каждый принятый ответ сохраняется как хорошее решение для дальнейшего улучшения бота.

## Структура

```text
backend/   FastAPI, SQLAlchemy, Alembic, Celery, integrations
frontend/  Next.js admin panel
seed/      test webhook payload
```

## Быстрый запуск

```bash
cd "/Users/graz1p/Desktop/Demi Results n8n copy project"
cp .env.example .env
docker compose up --build
```

Backend: `http://localhost:8000`
Frontend: `http://localhost:3000`
Healthcheck: `http://localhost:8000/health`

## Vercel + Supabase

Админку можно деплоить отдельно на Vercel. В этом режиме браузер не ходит напрямую в FastAPI.
Next.js использует server-side proxy route `/api/backend/*`, добавляет `X-Admin-API-Key` на стороне Vercel и прокидывает запросы в backend.

Подробная инструкция: [VERCEL_DEPLOY.md](./VERCEL_DEPLOY.md)

Vercel environment variables для frontend:

```env
BACKEND_API_URL=https://YOUR_BACKEND_DOMAIN
BACKEND_ADMIN_API_KEY=тот_же_ADMIN_API_KEY_что_в_backend
NEXT_PUBLIC_API_BASE_URL=/api/backend
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Supabase лучше использовать как managed PostgreSQL для backend. Тогда в backend `.env` ставится Supabase connection string:

```env
DATABASE_URL=postgresql+psycopg://postgres.YOUR_REF:PASSWORD@aws-0-region.pooler.supabase.com:6543/postgres
```

Для Celery все равно нужен Redis. Его можно оставить на сервере в Docker или взять managed Redis.

## Railway backend deploy

Railway должен деплоить backend, не frontend. В репозитории есть root `Dockerfile` и `railway.json`, поэтому для web-сервиса можно оставить Root Directory `/`.

Web service:

```text
Root Directory: /
Config file: /railway.json
Healthcheck path: /health
```

Worker service нужно создать отдельным Railway service из того же GitHub repo:

```text
Root Directory: /
Config file: /backend/railway.worker.json
```

Worker не должен быть exposed/public. Он только слушает Redis queue.

Обязательные Railway variables для web и worker:

```env
DATABASE_URL=
REDIS_URL=
OPENAI_API_KEY=
AMOCRM_BASE_URL=https://demicosmetics1.amocrm.ru
AMOCRM_ACCESS_TOKEN=
AMOJO_BASE_URL=https://amojo.amocrm.ru
ADMIN_API_KEY=
HUMAN_APPROVAL_ENABLED=true
TELEGRAM_BOT_TOKEN=
TELEGRAM_MANAGER_CHAT_ID=
TELEGRAM_ALLOWED_MANAGER_IDS=
TELEGRAM_WEBHOOK_SECRET=
PUBLIC_BACKEND_URL=https://your-railway-domain.up.railway.app
RUN_MIGRATIONS_ON_STARTUP=false
```

Когда `DATABASE_URL` уже заполнен и база доступна, можно временно поставить `RUN_MIGRATIONS_ON_STARTUP=true` для первого deploy, либо выполнить `alembic upgrade head` отдельной one-off командой в Railway. После миграций лучше вернуть `false`, чтобы обычные redeploy не падали из-за временной недоступности базы.

Если тариф Railway не позволяет создать отдельный worker service, можно временно запускать Celery worker внутри web-сервиса:

```env
RUN_WORKER_IN_WEB=true
CELERY_CONCURRENCY=2
```

Это подходит для проверки и небольшого трафика. Когда появится отдельный Railway worker, поставьте `RUN_WORKER_IN_WEB=false`, чтобы не обрабатывать задачи двумя worker одновременно.

## Обязательные env

```env
OPENAI_API_KEY=
OPENAI_INPUT_COST_PER_1M_TOKENS=0
OPENAI_OUTPUT_COST_PER_1M_TOKENS=0
AMOCRM_BASE_URL=https://demicosmetics1.amocrm.ru
AMOCRM_ACCESS_TOKEN=
DATABASE_URL=postgresql+psycopg://demi:change-me@postgres:5432/demi_results
REDIS_URL=redis://redis:6379/0
HUMAN_APPROVAL_ENABLED=true
TELEGRAM_BOT_TOKEN=
TELEGRAM_MANAGER_CHAT_ID=
TELEGRAM_WEBHOOK_SECRET=
PUBLIC_BACKEND_URL=https://YOUR_BACKEND_DOMAIN
AMOCRM_STATUS_ON_APPROVE=
AMOCRM_STATUS_ON_EDIT=
AMOCRM_STATUS_ON_REJECT=
AMOCRM_STATUS_ON_SAVE=
AMOCRM_STATUS_PRIMARY_CONTACT=
AMOCRM_STATUS_QUALIFIED=
AMOCRM_STATUS_CONSULTATION_SCHEDULED=
AMOCRM_STATUS_UNSORTED=
```

Google Sheets включается отдельно:

```env
GOOGLE_SHEETS_ENABLED=true
GOOGLE_SERVICE_ACCOUNT_FILE=/run/secrets/google-service-account.json
GOOGLE_SHEETS_SPREADSHEET_ID=1ffqB0K2e7QduCFBe--5wm7Lj4XU9-PO_r3TiSKea1og
```

## amoCRM webhook

В amoCRM укажите webhook URL:

```text
https://YOUR_DOMAIN/webhooks/amocrm
```

Для локального теста:

```bash
curl -X POST http://localhost:8000/webhooks/amocrm \
  -H "Content-Type: application/json" \
  --data @seed/amocrm_webhook.json
```

Webhook отвечает сразу, а AI обработка идет в Celery worker через 10 секунд.

## Telegram human-in-the-loop

Когда `HUMAN_APPROVAL_ENABLED=true`, бот не отправляет AI-ответ клиенту сразу. Он создает запись в `approval_requests` и отправляет менеджеру Telegram-карточку с кнопками:

```text
✅ Принять
✏️ Изменить
❌ Отклонить
🧠 Память
📋 Открыть лид
```

Карточка также показывает текущий этап сделки в amoCRM. Backend получает `pipeline_id`, `status_id` и название этапа через amoCRM API и сохраняет их в `approval_requests`.

После `✅ Принять` backend:

- отправляет ответ клиенту в amoCRM;
- сохраняет assistant message в `messages`;
- обновляет поля сделки в amoCRM;
- при подтвержденной записи обновляет Google Sheets;
- сохраняет исправленный менеджером текст в `approval_requests.edited_reply`.
- сохраняет финальный принятый ответ в `training_examples` как правильное решение для обучения.

`training_examples` хранит:

- исходное сообщение клиента;
- оригинальный AI-ответ;
- финальный принятый ответ;
- был ли ответ отредактирован;
- extracted memory;
- этап amoCRM;
- id менеджера Telegram.

Кнопка `💾 Сохранить` переводит заявку в статус `saved`. Команда `/no-sorted` в Telegram показывает последние сохраненные ответы, по которым менеджер еще не принял финальное решение.

Telegram env:

```env
HUMAN_APPROVAL_ENABLED=true
TELEGRAM_BOT_TOKEN=токен от @BotFather
TELEGRAM_MANAGER_CHAT_ID=id менеджера или группы
TELEGRAM_ALLOWED_MANAGER_IDS=id менеджеров через запятую
TELEGRAM_WEBHOOK_SECRET=любая длинная случайная строка
PUBLIC_BACKEND_URL=https://YOUR_BACKEND_DOMAIN
AMOCRM_STATUS_ON_APPROVE=123456
AMOCRM_STATUS_ON_EDIT=123457
AMOCRM_STATUS_ON_REJECT=123458
AMOCRM_STATUS_ON_SAVE=123459
```

`AMOCRM_STATUS_ON_*` — это `status_id` этапа amoCRM, куда надо перенести сделку после действия. Если оставить пустым, сделка не переносится. Узнать `status_id` можно через amoCRM API:

```bash
curl -H "Authorization: Bearer $AMOCRM_ACCESS_TOKEN" \
  "$AMOCRM_BASE_URL/api/v4/leads/pipelines"
```

Автоматическая маршрутизация входящих сообщений:

- если сообщение связано с продажей, подбором ухода или консультацией, бот переводит лид в `AMOCRM_STATUS_PRIMARY_CONTACT` и продолжает диалог;
- если сообщение явно не о продаже, например сотрудничество, реклама, вакансия или спам, бот переводит лид в `AMOCRM_STATUS_UNSORTED` и не отправляет sales-ответ;
- если после подтвержденного ответа заполнены данные карточки клиента, бот переводит лид в `AMOCRM_STATUS_QUALIFIED`;
- если консультация подтверждена на конкретные дату и время, бот переводит лид в `AMOCRM_STATUS_CONSULTATION_SCHEDULED`;
- если лид уже находится в `AMOCRM_STATUS_CONSULTATION_SCHEDULED`, бот новые сообщения не обрабатывает.

`TELEGRAM_MANAGER_CHAT_ID` отвечает только за то, куда бот отправляет карточки. `TELEGRAM_ALLOWED_MANAGER_IDS` отвечает за то, кто имеет право нажимать `Принять`, `Изменить`, `Отклонить`, `Сохранить`, смотреть память и использовать `/no-sorted`. Если карточки отправляются в группу, обязательно заполните `TELEGRAM_ALLOWED_MANAGER_IDS`, иначе участники группы не смогут принимать решения.

Как получить `TELEGRAM_MANAGER_CHAT_ID` и `TELEGRAM_ALLOWED_MANAGER_IDS`:

1. Напишите любое сообщение своему Telegram-боту.
2. Откройте:

```text
https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/getUpdates
```

3. Возьмите `message.chat.id` для `TELEGRAM_MANAGER_CHAT_ID`.
4. Возьмите `message.from.id` для `TELEGRAM_ALLOWED_MANAGER_IDS`.

Пример для двух менеджеров:

```env
TELEGRAM_ALLOWED_MANAGER_IDS=123456789,987654321
```

Как поставить Telegram webhook:

```bash
curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook?url=$PUBLIC_BACKEND_URL/webhooks/telegram/$TELEGRAM_WEBHOOK_SECRET"
```

## Миграции

```bash
cd backend
alembic upgrade head
alembic revision --autogenerate -m "change"
```

## Проверки

```bash
cd backend
python -m compileall app
ruff check app tests

cd ../frontend
npm install
npm run build
```

## Production notes

- Не храните секреты в коде. Используйте `.env`, secret manager или Docker secrets.
- Поставьте HTTPS reverse proxy перед backend.
- Ограничьте доступ к `/admin/*` через VPN/reverse proxy auth. Если задан `ADMIN_API_KEY`, backend требует заголовок `X-Admin-API-Key` для admin API.
- Для надежности держите минимум один backend process и один Celery worker.
- Все интеграционные ошибки пишутся в `action_logs`, сообщения не удаляются при ошибке отправки.
- Для подсчета стоимости заполните `OPENAI_INPUT_COST_PER_1M_TOKENS` и `OPENAI_OUTPUT_COST_PER_1M_TOKENS`; токены считаются напрямую из OpenAI usage.
