# DreamForge app

Next.js 15 App Router package for DreamForge (AI companions, chat, Moments, Stripe).

## Dev

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Production

Hosted on **Nubeku**, not Vercel.

- Live: https://dreamforge.apps.nubeku.com
- Secrets: https://dash.nubeku.com → app → Secrets
- Setup: [NUBEKU_ENV_SETUP.md](./NUBEKU_ENV_SETUP.md)

Root directory for Nubeku builds: this folder (`dreamforge-app`). Port `3000`.

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Turbopack dev server |
| `npm run build` | Production build (runs `verify-env`) |
| `npm start` | Serve production build |
| `npm run lint` | ESLint |
| `npm test` | Unit tests (`tsx --test`) |

See the [repo README](../README.md) and [CLAUDE.md](../CLAUDE.md) for product and architecture overview.
