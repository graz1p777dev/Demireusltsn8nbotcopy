#!/bin/bash
# Ручной бэкап базы данных прямо сейчас.
# Использование: ./deploy/backup_now.sh
set -e
cd "$(dirname "$0")/.."
mkdir -p backups
ts=$(date +%Y-%m-%d_%H-%M)
docker compose exec -T postgres pg_dump -U "${POSTGRES_USER:-demi}" -Fc "${POSTGRES_DB:-demi_results}" > "backups/demi_${ts}.dump"
echo "✅ Бэкап создан: backups/demi_${ts}.dump ($(du -h "backups/demi_${ts}.dump" | cut -f1))"
