#!/bin/bash
# Запуск локального тестера бота
# Использование: ./run_bot_tester.sh
set -e
cd "$(dirname "$0")/backend"
source venv/bin/activate
echo "🚀 Запуск Bot Tester..."
echo "   Открой: http://localhost:8080"
railway run python3 ../bot_tester.py
