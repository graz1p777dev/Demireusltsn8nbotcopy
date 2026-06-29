#!/usr/bin/env bash
# =============================================================================
#  Demi Results — Ubuntu Server Setup Script
#  Запускать: sudo bash setup.sh
# =============================================================================
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
info()    { echo -e "${CYAN}[INFO]${NC} $*"; }
success() { echo -e "${GREEN}[OK]${NC}  $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $*"; }
die()     { echo -e "${RED}[ERROR]${NC} $*" >&2; exit 1; }

[[ $EUID -ne 0 ]] && die "Запускайте от root: sudo bash setup.sh"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$SCRIPT_DIR"

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║   Demi Results — Server Setup                ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# ─────────────────────────────────────────────────────────────────────────────
# 1. СИСТЕМНЫЕ ПАКЕТЫ
# ─────────────────────────────────────────────────────────────────────────────
info "Обновляю apt и ставлю зависимости..."
apt-get update -qq
apt-get install -y -qq \
    ca-certificates curl gnupg lsb-release \
    nginx certbot python3-certbot-nginx \
    git ufw fail2ban \
    postgresql-client \
    jq bc

success "Системные пакеты установлены"

# ─────────────────────────────────────────────────────────────────────────────
# 2. DOCKER
# ─────────────────────────────────────────────────────────────────────────────
if command -v docker &>/dev/null; then
    success "Docker уже установлен: $(docker --version)"
else
    info "Устанавливаю Docker..."
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
        | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" \
        > /etc/apt/sources.list.d/docker.list
    apt-get update -qq
    apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    systemctl enable --now docker
    success "Docker установлен"
fi

# ─────────────────────────────────────────────────────────────────────────────
# 3. .ENV ФАЙЛ
# ─────────────────────────────────────────────────────────────────────────────
ENV_FILE="$PROJECT_DIR/.env"
if [[ -f "$ENV_FILE" ]]; then
    warn ".env уже существует, пропускаю создание"
else
    info "Создаю .env файл..."

    # Генерируем безопасные пароли
    PG_PASS=$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 32)
    JWT_SECRET=$(openssl rand -base64 48 | tr -dc 'a-zA-Z0-9' | head -c 64)
    ADMIN_KEY=$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 32)
    TG_WEBHOOK_SECRET=$(openssl rand -base64 16 | tr -dc 'a-zA-Z0-9' | head -c 24)

    read -rp "  Домен CRM (например crm.example.com): " DOMAIN_CRM
    read -rp "  Домен API (например api.example.com): " DOMAIN_API
    read -rp "  OpenAI API Key: " OPENAI_KEY
    read -rp "  Telegram Bot Token: " TG_TOKEN
    read -rp "  amoCRM Access Token: " AMO_TOKEN
    read -rp "  amoCRM Webhook Secret (придумай любую строку): " AMO_SECRET
    read -rp "  DeepSeek API Key (Enter чтобы пропустить): " DS_KEY

    cat > "$ENV_FILE" <<EOF
# ── Database ─────────────────────────────────────────────────────────────────
POSTGRES_DB=demi_results
POSTGRES_USER=demi
POSTGRES_PASSWORD=${PG_PASS}
DATABASE_URL=postgresql+psycopg://demi:${PG_PASS}@postgres:5432/demi_results

# ── Redis ────────────────────────────────────────────────────────────────────
REDIS_URL=redis://redis:6379/0

# ── App ──────────────────────────────────────────────────────────────────────
APP_ENV=production
JWT_SECRET=${JWT_SECRET}
ADMIN_API_KEY=${ADMIN_KEY}
CORS_ORIGINS=https://${DOMAIN_CRM}
FRONTEND_URL=https://${DOMAIN_CRM}
PUBLIC_BACKEND_URL=https://${DOMAIN_API}
RUN_MIGRATIONS_ON_STARTUP=true

# ── OpenAI ───────────────────────────────────────────────────────────────────
OPENAI_API_KEY=${OPENAI_KEY}
OPENAI_MODEL=gpt-4.1-mini
OPENAI_EXTRACTOR_MODEL=gpt-4.1-mini
OPENAI_MODEL_SIMPLE=gpt-5.1
OPENAI_MODEL_SALES=gpt-5.5
OPENAI_INPUT_COST_SIMPLE=1.25
OPENAI_OUTPUT_COST_SIMPLE=10.0
OPENAI_INPUT_COST_SALES=5.0
OPENAI_OUTPUT_COST_SALES=30.0
DEEPSEEK_API_KEY=${DS_KEY:-}

# ── Telegram ─────────────────────────────────────────────────────────────────
TELEGRAM_BOT_TOKEN=${TG_TOKEN}
TELEGRAM_WEBHOOK_SECRET=${TG_WEBHOOK_SECRET}
TELEGRAM_MANAGER_CHAT_ID=
TELEGRAM_EXTRA_MANAGER_CHAT_IDS=
TELEGRAM_ALLOWED_MANAGER_IDS=

# ── amoCRM ───────────────────────────────────────────────────────────────────
AMOCRM_BASE_URL=https://demicosmetics1.amocrm.ru
AMOCRM_ACCESS_TOKEN=${AMO_TOKEN}
AMOCRM_WEBHOOK_SECRET=${AMO_SECRET}
AMOJO_BASE_URL=https://amojo.amocrm.ru
AMOCRM_AI_USER_ID=0
AMOCRM_STATUS_ON_APPROVE=
AMOCRM_STATUS_ON_EDIT=
AMOCRM_STATUS_ON_REJECT=
AMOCRM_STATUS_ON_SAVE=
AMOCRM_STATUS_PRIMARY_CONTACT=
AMOCRM_STATUS_QUALIFIED=
AMOCRM_STATUS_CONSULTATION_SCHEDULED=
AMOCRM_STATUS_UNSORTED=

# ── Google Sheets ────────────────────────────────────────────────────────────
GOOGLE_SHEETS_ENABLED=false
GOOGLE_SERVICE_ACCOUNT_JSON=
GOOGLE_SHEETS_SPREADSHEET_ID=

# ── Frontend (Next.js build args) ────────────────────────────────────────────
NEXT_PUBLIC_API_BASE_URL=/api/backend
EOF

    # Домены сохраним отдельно для nginx
    echo "DOMAIN_CRM=${DOMAIN_CRM}" >> "$ENV_FILE"
    echo "DOMAIN_API=${DOMAIN_API}" >> "$ENV_FILE"

    chmod 600 "$ENV_FILE"
    success ".env создан (права 600)"
fi

# Читаем домены из .env
source <(grep -E '^(DOMAIN_CRM|DOMAIN_API)=' "$ENV_FILE")

# ─────────────────────────────────────────────────────────────────────────────
# 4. DOCKER COMPOSE — СБОРКА И ЗАПУСК
# ─────────────────────────────────────────────────────────────────────────────
cd "$PROJECT_DIR"

info "Собираю Docker образы..."
docker compose build --no-cache

info "Запускаю контейнеры..."
docker compose up -d

# Ждём когда backend здоров
info "Жду когда backend запустится..."
for i in $(seq 1 30); do
    if docker compose exec -T backend python -c \
        "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health')" \
        &>/dev/null; then
        success "Backend готов"
        break
    fi
    [[ $i -eq 30 ]] && die "Backend не стартовал за 60 сек. Смотри: docker compose logs backend"
    sleep 2
done

# ─────────────────────────────────────────────────────────────────────────────
# 5. NGINX
# ─────────────────────────────────────────────────────────────────────────────
info "Настраиваю nginx..."

# CRM (frontend)
cat > /etc/nginx/sites-available/demi-crm <<NGINX
server {
    listen 80;
    server_name ${DOMAIN_CRM:-_};

    location / {
        proxy_pass         http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade \$http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host \$host;
        proxy_set_header   X-Real-IP \$remote_addr;
        proxy_set_header   X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
NGINX

# API (backend)
cat > /etc/nginx/sites-available/demi-api <<NGINX
server {
    listen 80;
    server_name ${DOMAIN_API:-_};

    client_max_body_size 20M;

    location / {
        proxy_pass         http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header   Host \$host;
        proxy_set_header   X-Real-IP \$remote_addr;
        proxy_set_header   X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto \$scheme;
        proxy_read_timeout 120s;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/demi-crm /etc/nginx/sites-enabled/demi-crm
ln -sf /etc/nginx/sites-available/demi-api /etc/nginx/sites-enabled/demi-api
rm -f /etc/nginx/sites-enabled/default

nginx -t && systemctl reload nginx
success "Nginx настроен"

# ─────────────────────────────────────────────────────────────────────────────
# 6. SSL (Let's Encrypt)
# ─────────────────────────────────────────────────────────────────────────────
read -rp "Получить SSL-сертификаты сейчас? (домены должны уже смотреть на этот сервер) [y/N]: " DO_SSL
if [[ "${DO_SSL,,}" == "y" ]]; then
    read -rp "Email для Let's Encrypt: " LE_EMAIL
    certbot --nginx \
        -d "${DOMAIN_CRM}" -d "${DOMAIN_API}" \
        --non-interactive --agree-tos -m "$LE_EMAIL"
    # Автообновление
    (crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet && systemctl reload nginx") | crontab -
    success "SSL настроен, автообновление добавлено в cron"
else
    warn "SSL пропущен. Запустите позже: certbot --nginx -d ${DOMAIN_CRM:-crm.example.com} -d ${DOMAIN_API:-api.example.com}"
fi

# ─────────────────────────────────────────────────────────────────────────────
# 7. TELEGRAM WEBHOOK
# ─────────────────────────────────────────────────────────────────────────────
info "Регистрирую Telegram webhook..."
TG_TOKEN_VAL=$(grep '^TELEGRAM_BOT_TOKEN=' "$ENV_FILE" | cut -d'=' -f2-)
TG_SECRET_VAL=$(grep '^TELEGRAM_WEBHOOK_SECRET=' "$ENV_FILE" | cut -d'=' -f2-)
BACKEND_URL="https://${DOMAIN_API:-localhost}"

if [[ -n "$TG_TOKEN_VAL" && -n "$TG_SECRET_VAL" ]]; then
    curl -s -X POST "https://api.telegram.org/bot${TG_TOKEN_VAL}/setWebhook" \
        -d "url=${BACKEND_URL}/webhooks/telegram/${TG_SECRET_VAL}" \
        -d "allowed_updates=[\"message\",\"callback_query\"]" | jq .
    success "Telegram webhook зарегистрирован"
else
    warn "Telegram webhook пропущен — заполни TELEGRAM_BOT_TOKEN и TELEGRAM_WEBHOOK_SECRET в .env"
fi

# ─────────────────────────────────────────────────────────────────────────────
# 8. ФАЙРВОЛ
# ─────────────────────────────────────────────────────────────────────────────
info "Настраиваю UFW..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 'Nginx Full'
ufw --force enable
success "UFW настроен"

# ─────────────────────────────────────────────────────────────────────────────
# 9. БЭКАПЫ
# ─────────────────────────────────────────────────────────────────────────────
BACKUP_SCRIPT="/usr/local/bin/demi-backup.sh"
BACKUP_DIR="/var/backups/demi-results"

info "Настраиваю автоматические бэкапы PostgreSQL..."
mkdir -p "$BACKUP_DIR"

cat > "$BACKUP_SCRIPT" <<BACKUP
#!/usr/bin/env bash
# Demi Results — PostgreSQL backup
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR}"
KEEP_DAYS=30
DATE=\$(date +%Y-%m-%d_%H-%M)
FILE="\${BACKUP_DIR}/pg_\${DATE}.sql.gz"

source "${ENV_FILE}"

docker compose -f "${PROJECT_DIR}/docker-compose.yml" exec -T postgres \
    pg_dump -U "\${POSTGRES_USER}" "\${POSTGRES_DB}" | gzip > "\$FILE"

# Удаляем старые бэкапы
find "\$BACKUP_DIR" -name "pg_*.sql.gz" -mtime +\$KEEP_DAYS -delete

SIZE=\$(du -sh "\$FILE" | cut -f1)
echo "[\$(date)] Backup OK: \$FILE (\$SIZE)"
BACKUP

chmod +x "$BACKUP_SCRIPT"

# Ежедневно в 03:00 + ежечасно в первые 7 дней после деплоя
(crontab -l 2>/dev/null; echo "0 3 * * * $BACKUP_SCRIPT >> /var/log/demi-backup.log 2>&1") | crontab -

success "Бэкап настроен: ежедневно 03:00, хранятся 30 дней"
success "Файлы: $BACKUP_DIR"

# ─────────────────────────────────────────────────────────────────────────────
# 10. РОТАЦИЯ ЛОГОВ
# ─────────────────────────────────────────────────────────────────────────────
cat > /etc/logrotate.d/demi-results <<LOGROTATE
/var/log/demi-backup.log {
    weekly
    rotate 8
    compress
    missingok
    notifempty
}
LOGROTATE

# ─────────────────────────────────────────────────────────────────────────────
# ИТОГ
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║   ✅  Установка завершена!                                   ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo -e "  CRM:       ${GREEN}https://${DOMAIN_CRM:-localhost:3000}${NC}"
echo -e "  API:       ${GREEN}https://${DOMAIN_API:-localhost:8000}${NC}"
echo -e "  Бэкапы:    ${CYAN}${BACKUP_DIR}${NC}"
echo ""
echo "  Полезные команды:"
echo "    docker compose logs -f          — логи всех сервисов"
echo "    docker compose logs -f worker   — логи Celery"
echo "    docker compose ps               — статус контейнеров"
echo "    docker compose restart backend  — перезапустить backend"
echo "    $BACKUP_SCRIPT              — бэкап вручную"
echo ""
echo -e "  ${YELLOW}Не забудь в amoCRM обновить URL вебхука:${NC}"
echo "    https://${DOMAIN_API:-api.example.com}/webhooks/amocrm/"
echo ""
