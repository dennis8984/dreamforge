#!/usr/bin/env bash
# Copy a saved preset's idle clips out of the narration data dir so they can be
# uploaded to Supabase (or any public HTTPS host) and set as GREETER_IDLE_URLS.
set -euo pipefail

ROOT="${GREETER_ROOT:-$HOME/dreamforge-greeter}"
PRESET_ID="${1:-${GREETER_PRESET_ID:-}}"
DEST="${2:-$ROOT/idle-export}"

if [[ ! "$PRESET_ID" =~ ^[0-9a-f]{32}$ ]]; then
  echo "Usage: GREETER_PRESET_ID=<32 hex> $0 [preset_id] [dest]" >&2
  exit 1
fi

SOURCE="$ROOT/Realtime_Narration_Video/data/presets/$PRESET_ID"
if [[ ! -d "$SOURCE" ]]; then
  echo "Preset folder not found: $SOURCE" >&2
  echo "Save the character from the narration UI first (POST /api/presets)." >&2
  exit 1
fi

mkdir -p "$DEST"
shopt -s nullglob
clips=("$SOURCE"/character-idle-*.mp4)
if [[ ${#clips[@]} -eq 0 ]]; then
  echo "No idle clips in $SOURCE. Build the idle pool before exporting." >&2
  exit 1
fi

cp -f "${clips[@]}" "$DEST/"
echo "Exported ${#clips[@]} clips to $DEST"
echo "Upload those MP4s, then set GREETER_IDLE_URLS to the public URLs (comma-separated)."
