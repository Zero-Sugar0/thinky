# Environment Variables

> Back to [README](../README.md) | See also: [Architecture](./ARCHITECTURE.md), [Customization](./CUSTOMIZATION.md)

Copy the example file and fill in the values:

```bash
cp .env.example .env
```

## Quick start (minimum required)

| Variable | How to get it |
|----------|---------------|
| `BETTER_AUTH_SECRET` | Run `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | `http://localhost:3000` locally, or your production URL |
| `INTERNAL_API_SECRET` | Run `openssl rand -base64 32` (must match on web + eve services) |

On Vercel, set them on **both** the `web` and `eve` services — and add a database (see below).

## Database

### `DATABASE_URL` (required everywhere)

NuxtHub is pinned to PostgreSQL with the `postgres-js` driver, so a database is
required in development too — there is no local file fallback. Without it every
command that loads Nuxt stops with:

```
postgres-js driver requires DATABASE_URL, POSTGRES_URL, or POSTGRESQL_URL
environment variable when applyMigrationsDuringBuild is enabled
```

Provision [Neon from the Vercel Marketplace](https://vercel.com/marketplace/neon) — the
Deploy button in the README includes it — or add it to an existing project:

```bash
vercel integration add neon
```

The integration sets `DATABASE_URL` on Production and Preview. Add it to
**Development** as well (a separate Neon branch keeps local work off the
deployed data), then pull it locally:

```bash
vercel env pull
```

Migrations in [`server/db/migrations/postgresql/`](../server/db/migrations/postgresql/)
are applied during Vercel deployment builds and when running `pnpm dev`.
Local production builds do not mutate a configured database. To apply
migrations by hand:

```bash
pnpm db:migrate
```

The driver is pinned in [`nuxt.config.ts`](../nuxt.config.ts) rather than
auto-detected. Left to itself, NuxtHub falls back to `pglite` when no URL is
set, and pglite's WebAssembly payload does not survive the bundling eve does to
run the agent — the failure surfaces much later as a missing `pglite.data`.

### `NUXT_PUBLIC_SITE_URL` (optional)

Canonical URL for SEO — used for Open Graph images, Twitter cards, and canonical links. Set to your production URL (e.g. `https://your-app.vercel.app`). Falls back to the request origin when unset.

## Authentication

### `BETTER_AUTH_SECRET` (required)

Random secret used by [Better Auth](https://www.better-auth.com/docs/installation#set-environment-variables) to sign sessions and tokens.

```bash
openssl rand -base64 32
```

### `BETTER_AUTH_URL` (required)

Public URL of the Nuxt app. Used for auth callbacks and as the base URL for agent → Nuxt internal API calls.

| Environment | Value |
|-------------|-------|
| Local | `http://localhost:3000` |
| Production | `https://your-domain.vercel.app` |

## Internal API

### `INTERNAL_API_SECRET` (required)

Shared bearer token between the Eve agent service and the Nuxt internal API (`/api/internal/*`).

Used for:

- Caller identity for the agent's session instructions
- Slack account linking
- Phone linking lookup

**Must be identical** on both Vercel services (`web` and `eve`). If missing or mismatched, Slack and phone linking will fail silently or return 401.

## Vercel Blob (memory)

Eve's `fileMemory()` provider stores one private Blob document per user at
`eve/memory/file/<scope>/MEMORY.md`. Attach a Blob store to the project and
`BLOB_READ_WRITE_TOKEN` is provided automatically; without one the agent fails
on its first memory recall.

## AI provider

This template does not define AI keys in `.env.example`. The default model is set in [`agent/agent.ts`](../agent/agent.ts):

```typescript
model: "anthropic/claude-sonnet-5"
```

On Vercel, Eve handles provider configuration through the platform. For local development, follow [Eve docs](https://eve.dev) for your chosen provider.

## Vercel Connect (optional)

Remaining integrations use [Vercel Connect](https://vercel.com/docs/connect). GitHub and Linear are handled through Composio in **Settings → Apps**. For the other active Connect integrations, you must:

1. Create Connect resources for the active Vercel Connect integrations in your Vercel team (for example Slack)
2. Update connector UIDs in [`agent/channels/slack.ts`](../agent/channels/slack.ts) or the relevant active integration definition
3. Connect clients in **Settings → Integrations** in the app

See [Customization](./CUSTOMIZATION.md#integrations) for setup steps.

## Upstash QStash & Proactive Check (optional)

Thinky can proactively review user memories, current timezone, and unfinished tasks on an hourly schedule (e.g. asking about lunch, client follow-ups, or undone tasks) and send suggestions to the user's preferred channel (Web chat or Slack).

Configure a QStash schedule pointing to:
`POST https://your-domain.vercel.app/api/cron/proactive-check`

| Variable | Description |
|----------|-------------|
| `QSTASH_CURRENT_SIGNING_KEY` | Current signing key from Upstash QStash console |
| `QSTASH_NEXT_SIGNING_KEY` | Next signing key from Upstash QStash console (for key rotation) |
| `CRON_SECRET` | Optional fallback bearer token for cron jobs |
## Composio (optional)

### `COMPOSIO_API_KEY` (optional)

Composio Platform API key (`ak_...`) from [https://dashboard.composio.dev](https://dashboard.composio.dev). Used by Thinky to search and execute 1700+ tools from connected apps and generate user connect links, and by the web interface in **Settings → Apps** to manage connected app accounts.

On Vercel, set the same key from the same Composio project on both the `web`
and `eve` services. The agent binds each execution session to the active
connected-account ID for the requesting user; a different key or project on
either service makes an account appear connected in Settings but unavailable
to agent tool sessions.

## Camofox browser (optional)

Set these variables on the **Eve service**:

| Variable | Description |
|----------|-------------|
| `CAMOFOX_BASE_URL` | HTTPS origin of the Camofox service |
| `CAMOFOX_API_KEY` | Camofox service API key |

The browser tools derive an opaque, stable owner ID from the authenticated
Thinky principal. Do not configure a shared `CAMOFOX_USER_ID`. Every operation
sends this owner ID to Camofox, but the Camofox service must enforce ownership
for every tab/session endpoint; client-side scoping alone cannot isolate a
service that ignores `userId`. The tools only accept public HTTPS target URLs,
bound request time and response size, and do not retry browser actions.

The URL check protects the initial destination only. Configure Camofox's
network egress to block private, loopback, and link-local addresses as well,
including after redirects.

## Telegram (optional)

Create a bot with [@BotFather](https://t.me/botfather), then set these variables
on the **eve service**:

| Variable | Description |
|----------|-------------|
| `TELEGRAM_BOT_TOKEN` | Bot API token from BotFather |
| `TELEGRAM_WEBHOOK_SECRET_TOKEN` | Secret used to verify Telegram webhook requests |
| `TELEGRAM_BOT_USERNAME` | Bot username without `@`, used to detect group mentions |

After deploying, register the webhook URL
`https://your-domain.example.com/eve/v1/telegram` with Telegram's `setWebhook`
API. Eve does not register the webhook automatically. See the [Telegram setup
guide](./CUSTOMIZATION.md#telegram).

## Local-only files

These paths are gitignored and should never be committed:

| Path | Purpose |
|------|---------|
| `.env` | Local secrets |
| `.data/` | NuxtHub local state |
| `.eve/` | Eve dev cache |
| `.vercel/` | Vercel CLI link metadata |

Reset the database — destructive, it drops every table:

```bash
psql "$DATABASE_URL" -c 'drop schema public cascade; create schema public;'
pnpm db:migrate
```

Pointing `DATABASE_URL` at a fresh Neon branch does the same without dropping
anything.
