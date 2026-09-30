#!/usr/bin/env bash
# Start localhost services and the public bearer proxy.
# TTS (10101) and the Gemma server (8000) are started separately.
set -euo pipefail

ROOT="${GREETER_ROOT:-$HOME/dreamforge-greeter}"
cd "$ROOT"

if [[ -f "$ROOT/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT/.env"
  set +a
fi

if [[ -z "${GREETER_API_TOKEN:-}" ]]; then
  echo "Set GREETER_API_TOKEN in $ROOT/.env before starting." >&2
  exit 1
fi

mkdir -p "$ROOT/logs" "$ROOT/run"
PID_DIR="$ROOT/run"

start() {
  local name="$1"
  local script="$2"
  if [[ -f "$PID_DIR/$name.pid" ]] && kill -0 "$(cat "$PID_DIR/$name.pid")" 2>/dev/null; then
    echo "$name already running"
    return
  fi
  bash -c "$script" > "$ROOT/logs/$name.log" 2>&1 &
  echo $! > "$PID_DIR/$name.pid"
  echo "started $name (pid $(cat "$PID_DIR/$name.pid"))"
}

if [[ -x "$ROOT/diffusers-movie-server/gateway/venv/bin/python" ]]; then
  start gateway "cd '$ROOT/diffusers-movie-server/gateway' && exec ./venv/bin/python -m uvicorn app:app --host 127.0.0.1 --port 8630"
else
  echo "gateway venv missing — run pod-setup.sh" >&2
fi

if [[ -x "$ROOT/Realtime_Narration_Video/.venv/bin/uvicorn" ]]; then
  start narration "cd '$ROOT/Realtime_Narration_Video' && set -a && source .env && set +a && exec .venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8782"
else
  echo "narration venv missing — run pod-setup.sh" >&2
fi

if [[ -x "$ROOT/Realtime_Conversation_Video/.venv/bin/uvicorn" ]]; then
  start conversation "cd '$ROOT/Realtime_Conversation_Video' && set -a && source .env && set +a && exec .venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8791"
else
  echo "conversation venv missing — run pod-setup.sh" >&2
fi

export PROXY_PORT="${PROXY_PORT:-8790}"
start proxy "exec python3 '$ROOT/proxy.py'"

echo "Public surface: 0.0.0.0:${PROXY_PORT:-8790} (Bearer token required)."
echo "Logs: $ROOT/logs"
