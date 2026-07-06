#!/bin/bash
# Восстановление базы из бэкапа.
# Использование: ./deploy/restore.sh backups/demi_2026-07-06_12-00.dump
set -e
cd "$(dirname "$0")/.."
DUMP="$1"
if [ -z "$DUMP" ] || [ ! -f "$DUMP" ]; then
  echo "Использование: $0 <путь к .dump файлу>"
  echo "Доступные бэкапы:"
  ls -lh backups/*.dump 2>/dev/null || echo "  (нет бэкапов)"
  exit 1
fi
echo "⚠️  Это ПЕРЕЗАПИШЕТ текущую базу данных содержимым: $DUMP"
read -p "Продолжить? (yes/no): " confirm
[ "$confirm" = "yes" ] || exit 1
docker compose exec -T postgres pg_restore -U "${POSTGRES_USER:-demi}" -d "${POSTGRES_DB:-demi_results}" --clean --if-exists < "$DUMP"
echo "✅ База восстановлена из $DUMP"
