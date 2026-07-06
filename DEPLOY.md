# Деплой на VPS

Весь стек (Postgres, Redis, Backend, Celery Worker, Beat, Frontend, автобэкапы)
поднимается одной командой через Docker Compose.

## Требования

- VPS с Ubuntu 22.04+ (минимум 2 GB RAM, рекомендуется 4 GB)
- Docker + Docker Compose plugin

```bash
# Установка Docker на чистый сервер
curl -fsSL https://get.docker.com | sh
```

## Шаги

### 1. Скопировать проект на сервер

```bash
git clone https://github.com/graz1p777dev/Demireusltsn8nbotcopy.git
cd Demireusltsn8nbotcopy
```

### 2. Настроить .env

```bash
cp .env.example .env
nano .env
```

Обязательно заполнить:

| Переменная | Что это |
|---|---|
| `POSTGRES_PASSWORD` | Пароль базы (придумать сложный) |
| `DATABASE_URL` | `postgresql+psycopg://demi:<пароль>@postgres:5432/demi_results` |
| `REDIS_URL` | `redis://redis:6379/0` |
| `OPENAI_API_KEY` | Ключ OpenAI |
| `TELEGRAM_BOT_TOKEN` | Токен бота |
| `TELEGRAM_MANAGER_CHAT_ID` | Chat ID главного менеджера |
| `AMOCRM_ACCESS_TOKEN` | Токен amoCRM |
| `NEXT_PUBLIC_API_BASE_URL` | `https://<домен-или-IP>:8000` (адрес бэкенда для браузера) |

### 3. Запустить

```bash
docker compose up -d --build
```

Проверить статус:

```bash
docker compose ps          # все сервисы должны быть healthy/running
docker compose logs -f backend   # логи бэкенда
```

- Backend: `http://<IP>:8000` (health: `/health`)
- Frontend (CRM): `http://<IP>:3000`

### 4. Переключить вебхуки

- **Telegram**: `https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://<домен>/webhooks/telegram/<TELEGRAM_WEBHOOK_SECRET>`
- **amoCRM**: в настройках интеграции указать `https://<домен>/webhooks/amocrm`

> Для HTTPS поставь nginx/caddy перед портами 8000/3000, либо Cloudflare Tunnel.

### 5. Обновление версии

```bash
git pull
docker compose up -d --build
```

## Бэкапы

### Автоматические

Сервис `backup` в docker-compose делает дамп базы **каждые 24 часа**
в папку `./backups/` и удаляет дампы старше 14 дней
(настраивается через `BACKUP_KEEP_DAYS` в .env).

### Ручной бэкап

```bash
./deploy/backup_now.sh
```

### Восстановление

```bash
./deploy/restore.sh backups/demi_2026-07-06_12-00.dump
```

### Бэкап на другой сервер (рекомендуется)

Копировать папку backups по крону на отдельное хранилище:

```bash
# crontab -e (на VPS)
0 5 * * * rsync -a /path/to/project/backups/ user@backup-host:/backups/demi/
```

## Мониторинг

```bash
docker compose logs -f worker    # обработка сообщений
docker compose logs -f backup    # статус бэкапов
docker compose exec postgres psql -U demi -d demi_results -c "select count(*) from approval_requests;"
```
