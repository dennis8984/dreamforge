# Greeter pod

DreamForge does not run LTX on Vercel. This folder is what you copy onto a persistent Runpod Ubuntu pod (48 GB GPU with `nvfp4-fast`, or an RTX 5090 32 GB with `nvfp4-32gb`). One pod serves one live conversation. The homepage plays exported idle clips and does not call the GPU until someone starts a session.

## Install

On the pod:

```bash
bash dreamforge-app/scripts/greeter/pod-setup.sh
```

The script clones the Apache-2.0 apps, builds the Python environments it can, and prints the weight checklist. `diffusers-movie-server` does not ship LTX weights. Its backend virtualenv is a symlink to the upstream author's machine, so point `backends/ltx2_5/.venv` at a local [diffusers-ltx2_5](https://github.com/animede/diffusers-ltx2_5) install before loading the gateway. Accept the Hugging Face gates for LTX-2.5 and Gemma first.

Also start, on localhost only:

- AivisSpeech Engine on port 10101. Pick an English speaker and set `TTS_SPEAKER_ID`. A Japanese-only speaker will not match the English greeting.
- Gemma 4 via llama.cpp on port 8000, with `input_audio` and `--parallel 2` or higher. On a 32 GB card, keep this process off the video GPU.

Do not publish ports 8630, 8782, 8791, 8000, or 10101. `start-greeter.sh` binds those to 127.0.0.1 and opens only the bearer proxy (port 8790).

## Character

Tunnel port 8782, open the narration UI, upload her portrait, set the conversation language to English, and let the idle pool finish. Save a preset. Put that 32-character id in `GREETER_PRESET_ID` on the pod and in DreamForge.

```bash
GREETER_PRESET_ID=<id> ~/dreamforge-greeter/export-idle.sh
```

Upload the MP4s and set `GREETER_IDLE_URLS` on the website to those public URLs.

DreamForge sends her persona as the conversation ROLE when a session starts. Replies stay short because video does not begin until the full reply is finished.

## Site environment

```
GREETER_CONVERSATION_URL=https://<pod>-8790.proxy.runpod.net/conversation
GREETER_NARRATION_URL=https://<pod>-8790.proxy.runpod.net/narration
GREETER_PRESET_ID=<32 hex characters>
GREETER_API_TOKEN=<same value as the pod>
GREETER_IDLE_URLS=https://<storage>/idle-000.mp4,https://<storage>/idle-001.mp4
```

Apply `supabase/migrations/016_greeter_sessions.sql` before starting live sessions.

LTX-2.5 and Gemma are not covered by the Apache-2.0 app license. Confirm commercial use with those providers. The narration project also asks paid deployments to [open an issue](https://github.com/animede/Realtime_Narration_Video/issues).
