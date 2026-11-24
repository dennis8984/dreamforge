# DreamForge

AI companion platform — chat, create characters, generate images/video, and run voice calls. Built with **Next.js 15**, **Supabase**, and **Tailwind CSS**. Production hosts on **[Nubeku](https://nubeku.com)** (not Vercel).

**Live:** [dreamforge.apps.nubeku.com](https://dreamforge.apps.nubeku.com) · **Dashboard:** [dash.nubeku.com](https://dash.nubeku.com) · **Repo:** [dennis8984/dreamforge](https://github.com/dennis8984/dreamforge)

## Product

- Dark guest shell with icon rail, hero carousel, and portrait cast rows (21+ cast)
- Chat-first character pages with image / video / voice
- Character builder, social feed, follow, and Moments credits
- Subscriptions: Free · Lite · Premium · Ultimate (Stripe)
- Content modes S1E / S2E / S3E / S3C (tier-gated)
- Admin Mission Control for models, characters, and ops

## Stack

| Layer | Choice |
|-------|--------|
| App | Next.js 15 (App Router) in `dreamforge-app/` |
| Auth + DB | Supabase (JWT, Postgres, Realtime, Storage) |
| Payments | Stripe |
| Image / video | Runpod + SpicyAPI |
| Chat LLM | Runpod (GLM/Qwen) with OpenRouter fallback |
| Voice | ElevenLabs + browser SpeechRecognition |
| Host | Nubeku (`*.apps.nubeku.com`, secrets vault, Cloudflare CDN) |

## Quick start

```bash
cd dreamforge-app
cp .env.example .env.local   # fill keys — see NUBEKU_ENV_SETUP.md
npm install
npm run dev                  # http://localhost:3000
```

```bash
npm run build   # production build
npm run lint
```

## Deploy (Nubeku)

1. Connect this GitHub repo in [dash.nubeku.com](https://dash.nubeku.com)
2. Root / app directory: `dreamforge-app` · port `3000` · Node 22+
3. Paste secrets from `.env.example` (mark sensitive values as secrets)
4. Set `NEXT_PUBLIC_*` **before** the build; push to the connected branch to ship

Canonical production hostname: **`dreamforge.apps.nubeku.com`**.  
Do not use the older `dreamforge-app.apps.nubeku.com` deploy — that build is stale.

Details: [`DEPLOYMENT.md`](./DEPLOYMENT.md) · [`dreamforge-app/NUBEKU_ENV_SETUP.md`](./dreamforge-app/NUBEKU_ENV_SETUP.md)

## Repo layout

```
dreamforge-app/     # Next.js app (pages, API, components, lib)
supabase/           # Shared schema / migrations (also under dreamforge-app/supabase)
runpod/             # GPU worker Docker for serverless endpoints
backend/            # Legacy FastAPI service (not used by the Next.js product path)
```

Agent-oriented architecture notes: [`CLAUDE.md`](./CLAUDE.md).

## Subscriptions & Moments

| Tier | Price | Messages/day | Moments/mo |
|------|-------|--------------|------------|
| Free | $0 | 20 | 0 |
| Lite | $5.99 | 100 | 500 |
| Premium | $14.99 | Unlimited | 2,000 |
| Ultimate | $29.99 | Unlimited | 5,000 |

Moments costs (approx.): image 50 · video 600 · voice 100/min · character create 500 (first free) · signup bonus 200.

## License

See repository license files for terms.
