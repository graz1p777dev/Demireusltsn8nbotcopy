# Бриф для ИИ-агента: бэкенд AI-бота Demi Results

Это контекст и задачи для работы над **бэкендом** (эта репа). Фронт единой CRM —
в отдельной репе `DemiResultsCRM` (Next.js + Supabase + shadcn), туда ты не лезешь.
Твоя зона — только FastAPI-бэкенд бота и его инфраструктура.

## Что это за проект

AI-бот-ассистент косметолога Demi Results. Клиенты пишут в amoCRM → бэкенд
получает вебхук → буферизует сообщения → прогоняет через AI-пайплайн (классификация
намерения, генерация ответа, извлечение полей) → отправляет карточку одобрения
менеджеру в Telegram → менеджер принимает/редактирует → ответ уходит клиенту в amoCRM.

## Стек и инфраструктура

| Слой | Технология |
|---|---|
| API | FastAPI (Python 3.12) |
| Очереди | Celery + Celery Beat, брокер Redis |
| БД | PostgreSQL + SQLAlchemy + Alembic |
| Интеграции | amoCRM (чаты/лиды), OpenAI (GPT + Whisper), Telegram Bot API |
| Хостинг | Railway (авто-деплой из push в `main`) |
| Домен API | `https://api-demiresults.alihan-torebekov.kg` |

Ключевые файлы:
- `backend/app/api/webhooks.py` — вебхуки amoCRM/Telegram/OpenAI
- `backend/app/api/admin.py` — админ-ручки для фронта (`/admin/*`)
- `backend/app/tasks/pipeline.py` — Celery-пайплайн обработки сообщений
- `backend/app/services/{openai_service,telegram,amocrm,repository}.py` — сервисы
- `backend/app/services/prompts.py` — системные промпты
- `backend/app/models/entities.py` — модели БД
- `docker-compose.yml` + `deploy/` — VPS-деплой с автобэкапами Postgres

## Как работать

- Правки — хирургические, минимальный код под задачу. Не рефакторить рабочее.
- Русский в общении; код/имена — английские.
- Каждое изменение: проверить `python -m pytest tests/ -q` и синтаксис, потом
  `git commit` + `git push` (Railway задеплоит сам). На `main` можно пушить.
- Не хранить секреты в коде. Переменные — через Railway variables / `.env`.
- Прод-логи: `railway logs --service Demireusltsn8nbotcopy`.

## Контракт с фронтом (единая CRM)

Фронт дёргает бэкенд через прокси `/api/backend/*` → твои ручки `/admin/*`.
Уже существующие ручки, которые использует фронт (не ломать их формат ответа):

| Ручка | Назначение |
|---|---|
| `GET /admin/conversations` | список диалогов |
| `GET /admin/chat/{leadId}` | история чата (роли user/assistant/manager) |
| `GET /admin/analytics` | сводная аналитика |
| `GET /admin/analytics/tokens` | расход токенов по периодам + $ |
| `GET /admin/analytics/managers` | активность менеджеров |
| `GET /admin/reports/daily?days=30` | ежедневная сводка |
| `GET/POST/DELETE /admin/blacklist` | чёрный список |
| `GET/PUT /admin/stop-words` | стоп-слова |
| `GET/PATCH /admin/bot-prompt` | системный промпт бота |
| `GET/PATCH /admin/bot-model` | выбор GPT-модели |
| `GET /admin/openai-models` | список моделей OpenAI |
| `GET/POST/DELETE /admin/managers` | менеджеры Telegram |
| `POST /admin/ai-test` | тест ИИ (модель, температура, промпт, фото) |
| `POST /admin/ai-test/transcribe` | расшифровка голосового (Whisper) |

Если добавляешь новую ручку для фронта — префикс `/admin/...`, JSON-ответ,
и сообщи фронтовому агенту её сигнатуру.

## Текущие задачи бэкенда под единую CRM

1. **CORS/доступ.** Убедиться, что бэкенд принимает запросы с домена новой CRM
   на Vercel (проверить `cors_origins` в конфиге, добавить домен фронта).
2. **Админ-ключ.** Если фронт шлёт заголовок `X-Admin-API-Key`, реализовать/проверить
   его валидацию для `/admin/*` (сейчас фронт-прокси умеет его прокидывать).
3. **Стабильность ручек.** Проверить, что все ручки из таблицы выше возвращают
   ожидаемый фронтом формат (см. типы в новой репе `src/lib/bot-api.ts` и страницах
   `dashboard/{dialogs,bot-analytics,bot-reports,bot-settings}` по мере их переноса).
4. **По запросу фронта** — добавлять недостающие ручки (например, отправка ответа,
   одобрение/отклонение через веб, если решим дублировать Telegram-флоу в UI).

## Что НЕ трогать

- Логику Telegram-одобрения и amoCRM-отправки без явной задачи.
- Формат существующих ответов `/admin/*` (сломает фронт).
- Пайплайн Celery без необходимости — он в проде обрабатывает реальные лиды.
