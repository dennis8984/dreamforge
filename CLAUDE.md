# DreamForge

AI companion platform built with Next.js 15 (App Router), Supabase, and Tailwind CSS.

## Project Structure

```
dreamforge-app/           # Next.js 15 application
├── app/                   # App Router pages and API routes
│   ├── admin/             # Admin dashboard (role-based auth)
│   ├── api/               # API routes (all require auth via auth-helpers.ts)
│   │   ├── chat/          # Chat conversations, messages, memories, personas, rate-limit
│   │   ├── feed/          # Social feed posts, reactions, comments
│   │   ├── follow/        # Character follow/unfollow
│   │   ├── moments/       # Credits system (balance, history, purchase, packages)
│   │   ├── stripe/        # Stripe checkout, webhook, portal
│   │   ├── video/         # Video generation (generate, status polling)
│   │   ├── voice/         # Voice calls (session, speak with TTS)
│   │   ├── moderation/    # Content reporting
│   │   └── user/          # GDPR export and account deletion
│   ├── chat/              # Chat UI pages
│   ├── feed/              # Social feed page
│   ├── character/[slug]/  # Character detail with tabs
│   ├── characters/        # Character gallery with categories
│   └── pricing/           # 4-tier subscription + moments packages
├── components/
│   ├── chat/              # 17 chat UI components
│   ├── feed/              # 4 feed components (FeedPost, FeedTimeline, etc.)
│   ├── voice/             # VoiceCallModal, VoiceButton
│   ├── character-builder/ # 8-step character creation wizard
│   └── admin/             # MissionControl* components
├── lib/
│   ├── auth-helpers.ts    # Server auth: requireAuth, requireAdmin, isAuthUser, getUserTier
│   ├── supabase.ts        # Client-side Supabase (can be null if not configured)
│   ├── supabase-server.ts # Server-side Supabase with service role key
│   ├── stripe.ts          # Lazy-initialized Stripe client (proxy pattern)
│   ├── chat-ai.ts         # Runpod LLM + OpenRouter fallback
│   ├── content-modes.ts   # S1E/S2E/S3E/S3C mode config
│   ├── prompt-builder.ts  # System prompt assembly
│   ├── memory-extractor.ts# Fire-and-forget memory extraction
│   ├── rate-limiter.ts    # Per-tier message rate limiting
│   ├── moments-config.ts  # Credit costs and packages
│   ├── encryption.ts      # AES-256-GCM message encryption
│   ├── moderation.ts      # Content moderation through SpicyAPI chat models
│   ├── video-generation.ts# Runpod video generation
│   ├── voice-client.ts    # Browser SpeechRecognition + audio playback
│   ├── realtime.ts        # Supabase Realtime subscriptions
│   └── seed-characters.ts # 32 pre-built characters
├── stores/                # Zustand stores (auth, chat, notification, ui)
├── types/chat.ts          # Chat system TypeScript types
├── hooks/                 # useRealtimeChat
├── middleware.ts          # Security headers, route classification
└── supabase/migrations/   # Migrations 002-013
```

## Key Architecture Decisions

- **Auth**: JWT-based via Supabase. All admin routes use `requireAdmin()` from `lib/auth-helpers.ts`. Never use hardcoded keys.
- **Supabase client** (`lib/supabase.ts`): Can be `null` if env vars not set. Always null-check before use.
- **Supabase admin** (`lib/supabase-server.ts`): Uses service role key. Call `getSupabaseAdmin()` which throws if not configured.
- **Stripe** (`lib/stripe.ts`): Lazily initialized via Proxy to avoid build-time errors without API key.
- **AI Chat**: Primary via Runpod serverless (GLM/Qwen), fallback via OpenRouter (Grok/Gemini).
- **Moments**: Credits system with atomic debit/credit via PostgreSQL `FOR UPDATE` row locks.
- **Content modes**: S1E (free), S2E (lite+), S3E (premium+), S3C (premium+) - tier-gated.
- **Migrations**: Use idempotent `DO $$ BEGIN ... EXCEPTION WHEN` pattern.

## Development

```bash
cd dreamforge-app
npm run dev          # Next.js dev server (Turbopack)
npm run build        # Production build (no Turbopack - known page collection issues)
npm run lint         # ESLint
```

## Build Notes

- `npm run build` uses webpack (not Turbopack) due to Turbopack page data collection errors in production.
- `npm run dev` still uses Turbopack for fast development.
- Build will succeed without env vars (Supabase/Stripe clients handle missing keys gracefully).
- Existing warnings (unused vars, `<img>` vs `<Image>`, Hook deps) are non-blocking.

## Subscription Tiers

| Tier | Price | Messages/day | Moments/mo |
|------|-------|-------------|------------|
| Free | $0 | 20 | 0 |
| Lite | $5.99 | 100 | 500 |
| Premium | $14.99 | Unlimited | 2,000 |
| Ultimate | $29.99 | Unlimited | 5,000 |

## Moments Costs

- Image generation: 50
- Video generation: 600
- Voice call: 100/min
- Character creation: 500 (first free)
- Signup bonus: 200

## Environment Variables

See `.env.example` for the full list. Key ones:
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`
- `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`
- `RUNPOD_CHAT_API_URL`, `OPENROUTER_API_KEY`
- `ELEVENLABS_API_KEY`, `CHAT_ENCRYPTION_KEY`
