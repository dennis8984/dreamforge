#!/usr/bin/env bash
# Install the realtime greeter stack on a Runpod Ubuntu pod.
# This machine must be Linux with an NVIDIA GPU (48 GB preferred, 32 GB minimum).
# It does not download model weights. Accept the Hugging Face gates for LTX-2.5
# and Gemma, then follow the printed checklist.
set -euo pipefail

if [[ "$(uname -s)" != "Linux" ]]; then
  echo "Run this on the Runpod Ubuntu pod. $(uname -s) cannot host LTX-2.5." >&2
  exit 1
fi

ROOT="${GREETER_ROOT:-$HOME/dreamforge-greeter}"
mkdir -p "$ROOT"
cd "$ROOT"

if command -v apt-get >/dev/null 2>&1; then
  sudo apt-get update
  sudo apt-get install -y python3 python3-venv python3-pip ffmpeg git curl ca-certificates
fi

clone() {
  local url="$1"
  local dir="$2"
  local branch="$3"
  if [[ -d "$dir/.git" ]]; then
    git -C "$dir" fetch --depth 1 origin "$branch"
    git -C "$dir" checkout "$branch"
    git -C "$dir" pull --ff-only origin "$branch"
  else
    git clone --depth 1 --branch "$branch" "$url" "$dir"
  fi
}

clone https://github.com/animede/diffusers-movie-server.git diffusers-movie-server master
clone https://github.com/animede/diffusers-ltx2_5.git diffusers-ltx2_5 main
clone https://github.com/animede/Realtime_Narration_Video.git Realtime_Narration_Video master
clone https://github.com/animede/Realtime_Conversation_Video.git Realtime_Conversation_Video main

if [[ ! -x diffusers-movie-server/gateway/venv/bin/python ]]; then
  python3 -m venv diffusers-movie-server/gateway/venv
  diffusers-movie-server/gateway/venv/bin/pip install -r diffusers-movie-server/gateway/requirements.txt
fi

if [[ ! -x Realtime_Narration_Video/.venv/bin/python ]]; then
  python3 -m venv Realtime_Narration_Video/.venv
  (
    cd Realtime_Narration_Video
    .venv/bin/pip install -e '.[dev]'
  )
fi

if [[ ! -x Realtime_Conversation_Video/.venv/bin/python ]]; then
  python3 -m venv Realtime_Conversation_Video/.venv
  Realtime_Conversation_Video/.venv/bin/pip install -r Realtime_Conversation_Video/requirements.txt
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
install -m 0755 "$SCRIPT_DIR/proxy.py" "$ROOT/proxy.py"
install -m 0755 "$SCRIPT_DIR/start-greeter.sh" "$ROOT/start-greeter.sh"
install -m 0755 "$SCRIPT_DIR/export-idle.sh" "$ROOT/export-idle.sh"

if [[ ! -f "$ROOT/.env" ]]; then
  cp "$SCRIPT_DIR/env.pod.example" "$ROOT/.env"
  echo "Wrote $ROOT/.env — fill in GREETER_API_TOKEN before starting."
fi

# Narration stays on localhost. The proxy is the only public port.
NARRATION_ENV="$ROOT/Realtime_Narration_Video/.env"
if [[ ! -f "$NARRATION_ENV" ]]; then
  cat > "$NARRATION_ENV" <<'EOF'
HOST=127.0.0.1
PORT=8782
GATEWAY_URL=http://127.0.0.1:8630
GATEWAY_PRESET=nvfp4-fast
TTS_URL=http://127.0.0.1:10101
TTS_SPEAKER_ID=888753760
LLM_URL=http://127.0.0.1:8000/v1
LLM_MODEL=
LLM_API_KEY=
NARRATION_DATA=./data
TARGET_CHUNK_SECONDS=5.0
STARTUP_BUFFER_CHUNKS=1
CORS_ORIGINS=http://127.0.0.1:8790
EOF
fi

CONV_ENV="$ROOT/Realtime_Conversation_Video/.env"
if [[ ! -f "$CONV_ENV" ]]; then
  cat > "$CONV_ENV" <<'EOF'
LLM_BASE_URL=http://127.0.0.1:8000/v1
NARRATION_URL=http://127.0.0.1:8782
NARRATION_PUBLIC_URL=http://127.0.0.1:8782
MAX_HISTORY=4
SUMMARY_THRESHOLD_CHARS=150
EOF
fi

cat <<EOF

Installed under $ROOT.

The movie-server checkout does not include LTX weights. Its backend venv is a
symlink to the upstream author's machine. On this pod:

  1. Accept the Hugging Face license for LTX-2.5 and install diffusers-ltx2_5
     using the nvfp4-fast preset (48 GB) or nvfp4-32gb (RTX 5090).
     Docs: https://github.com/animede/diffusers-ltx2_5
  2. Point diffusers-movie-server/backends/ltx2_5/.venv at that environment.
     See backends/ltx2_5/VENV_REBUILD.md in the movie-server repo.
  3. Install AivisSpeech Engine on 127.0.0.1:10101. List speakers and pick an
     English voice, then set TTS_SPEAKER_ID. Japanese-only speakers will not
     match an English greeting.
  4. Run a Gemma 4 llama.cpp server on 127.0.0.1:8000 with audio input and
     --parallel 2 (or higher). On a 32 GB card this process must not share the
     GPU with LTX.
  5. Keep ports 8630, 8782, 8791, 8000, and 10101 off the public internet.
  6. Fill in $ROOT/.env and run $ROOT/start-greeter.sh
  7. SSH-tunnel port 8782, register her portrait, set conversation language to
     en, build the idle pool, and save a preset.
  8. Put that preset id in GREETER_PRESET_ID here and in DreamForge.
  9. Run export-idle.sh and upload the MP4s. Set GREETER_IDLE_URLS on the site.

DreamForge talks only to the proxy:

  GREETER_CONVERSATION_URL=https://<pod>-8790.proxy.runpod.net/conversation
  GREETER_NARRATION_URL=https://<pod>-8790.proxy.runpod.net/narration
  GREETER_API_TOKEN=<same secret as the pod>

App code is Apache-2.0. LTX-2.5 and Gemma have their own licenses. For a paid
site, also leave a note on
https://github.com/animede/Realtime_Narration_Video/issues
EOF
