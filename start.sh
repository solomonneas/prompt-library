#!/usr/bin/env bash
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND="$ROOT/backend"
FRONTEND="$ROOT/frontend"

if [ ! -d "$BACKEND/venv" ]; then
  python3 -m venv "$BACKEND/venv"
fi

source "$BACKEND/venv/bin/activate"
pip install -r "$BACKEND/requirements.txt"

( cd "$BACKEND" && uvicorn app:app --host 0.0.0.0 --port 5202 ) &
BACK_PID=$!

( cd "$FRONTEND" && npm install && npm run dev ) &
FRONT_PID=$!

trap 'kill $BACK_PID $FRONT_PID 2>/dev/null || true' EXIT
wait
