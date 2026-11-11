#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
cd "$DIR"

echo "=== راه‌اندازی سامانه مدرسه (Next.js + PocketBase) ==="

# بررسی اجرای پاکت‌بیس
if ! curl -s http://127.0.0.1:8095/api/health >/dev/null 2>&1; then
  echo "درحال اجرای PocketBase روی پورت 8095..."
  ./backend/pocketbase serve --http=127.0.0.1:8095 --dir=backend/pb_data &
  PB_PID=$!
  sleep 1
else
  echo "PocketBase هم‌اکنون در حال اجراست."
fi

echo "درحال اجرای فرانت‌اند Next.js..."
cd frontend
bun run dev -p 3005
