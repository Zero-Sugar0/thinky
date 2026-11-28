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

## Upstash QStash: check-ins and reminders (optional)

All scheduled work runs on Upstash QStash, not on Eve cron. Create two schedules in the QStash console:

| Route | Schedule | Purpose |
|-------|----------|---------|
| `POST https://your-domain.vercel.app/api/cron/dispatch` | every minute (`* * * * *`) | Sends due reminders on time and drains queued check-ins to each user's channels |
| `POST https://your-domain.vercel.app/api/cron/proactive-check` | hourly (`0 * * * *`) | Decides whether each opted-in user gets a routine check-in, then queues it. Each user sets their own frequency (2h, 4h, 8h or daily) in Settings, and urgent overdue items are not limited by it |

The check-in policy is random within limits: quiet hours 22:00 to 08:00 in the user's timezone, at most three check-ins in any 24 hours, a six-hour cooldown per category, and about half of routine windows produce one. Overdue or due-soon tasks are always surfaced.

| Variable | Description |
|----------|-------------|
| `QSTASH_CURRENT_SIGNING_KEY` | Current signing key from Upstash QStash console |
| `QSTASH_NEXT_SIGNING_KEY` | Next signing key from Upstash QStash console (for key rotation) |
| `CRON_SECRET` | Optional fallback bearer token for cron jobs |
| `TELEGRAM_BOT_TOKEN` | Used to send Telegram check-ins and reminders (see the Telegram section) |

Delivery channels: web chat (always, recorded in the thread), Slack (via the linked Slack account), Telegram (once a chat is linked), and iMessage (once the user has messaged Thinky from their linked number). The QStash dispatcher sends iMessage directly through Photon, so no agent turn is needed. Each reminder or notification uses its id as the idempotency key, so a retried job does not send twice. On a shared line, Photon only lets the agent message a person after they have texted that line first. A notification that no channel accepts is released and retried. Reminders always keep web chat as a fallback, so an iMessage reminder that fails is not retried.

## Growth Engine (Treg) (optional)

### `TREG_TOKEN` (optional)

API token for [Treg](https://treg.to) (`treg org agent-new <name>`).
Gives the agent access to 4,100+ tools across 123+ providers for B2B leads, people and company enrichment, Google SERP rankings, backlinks, and web scraping. Also enables the `growth` and `seo` subagents.

On Vercel, set `TREG_TOKEN` on the `eve` service (or both services). Customer attribution is automatically tagged with `X-Treg-Meta: customer=<principalId>`.

## Recall.ai Meeting Facilitator & Transcripts (optional)

Enables Thinky to join Zoom, Google Meet, Microsoft Teams, and Webex calls, speak with participants, and save a transcript. Recall's native Deepgram Voice Agent handles live listening and speech, while a generated JPEG avatar appears as the bot's video tile. Recall separately uses Deepgram for real-time transcript events and post-meeting transcript artifacts.

| Variable | Description |
|----------|-------------|
| `RECALL_REGION` | Chosen isolated Recall region: `us-west-2` (default), `us-east-1`, `eu-central-1`, or `ap-northeast-1` |
| `RECALL_API_KEY` | Region-specific Recall API key from dashboard |
| `RECALL_WORKSPACE_VERIFICATION_SECRET` | Secret used to verify incoming HMAC SHA-256 signatures from Recall webhooks |
| `PUBLIC_API_BASE_URL` | Stable public HTTPS app URL (e.g. `https://your-domain.vercel.app` or a public tunnel in dev) receiving Recall webhook callbacks. |

Save a Deepgram Voice Agent credential under Agents → Deepgram in the same
Recall workspace and region used by `RECALL_API_KEY`. Meeting creation configures
Nova-3 speech recognition, OpenAI `gpt-4o-mini` reasoning, and Aura-2 Thalia
speech synthesis through Recall's native `output_media.audio` integration; do not
put provider API keys in the bot request. The generated 16:9 JPEG avatar is sent
via `automatic_video_output`. Set `RECALL_API_KEY` on both the **web** and
**eve** services if both can create bots, and set `PUBLIC_API_BASE_URL` on each
service that creates bots. Meeting creation sends `transcript.data` events to
`<PUBLIC_API_BASE_URL>/api/webhooks/recall`. The same endpoint receives Recall
lifecycle and post-meeting transcript events and verifies each request with
`RECALL_WORKSPACE_VERIFICATION_SECRET` on the web service. Live meeting audio
no longer depends on the custom facilitator webpage, AI Gateway, or
`BETTER_AUTH_SECRET`. Recall bots use the documented `web_4_core` variant.

## Composio (optional)

### `COMPOSIO_API_KEY` (optional)

Composio Platform API key (`ak_...`) from [https://dashboard.composio.dev](https://dashboard.composio.dev). Used by Thinky to search and execute 1700+ tools from connected apps and generate user connect links, and by the web interface in **Settings → Apps** to manage connected app accounts.

On Vercel, set the same key from the same Composio project on both the `web`
and `eve` services. The agent binds each execution session to the active
connected-account ID for the requesting user; a different key or project on
either service makes an account appear connected in Settings but unavailable
to agent tool sessions.

## Camofox browser (optional)

Set these variables on both the **Eve** and **web** services. Eve uses them
for browser tools and initial live-view links; the authenticated web API uses
them to renew links while the agent is actively working:

| Variable | Description |
|----------|-------------|
| `CAMOFOX_BASE_URL` | HTTPS origin of the Camofox service (for example, `https://camofox-browser-production-a211.up.railway.app`) |
| `CAMOFOX_ACCESS_KEY` | Shared Camofox access key; sent as `Authorization: Bearer <key>` |
| `CAMOFOX_NOVNC_URL` | Separate public HTTPS origin for the Railway noVNC domain targeting port 6080 |

The browser tools derive an opaque, stable owner ID from the authenticated
Thinky principal. Do not configure a shared `CAMOFOX_USER_ID`. Every operation
sends this owner ID to Camofox and authenticates with the shared access key,
but the Camofox service must enforce ownership for every tab/session endpoint;
client-side scoping alone cannot isolate a service that ignores `userId`. The
tools only accept public HTTPS target URLs, bound request time and response
size, and do not retry browser actions. Camofox exempts `/health` and
`/vnc/status` from access-key authentication; all other requests send the key
only in the `Authorization: Bearer` header, never in the URL or logs.

The URL check protects the initial destination only. Configure Camofox's
network egress to block private, loopback, and link-local addresses as well,
including after redirects.

To check whether the configured service returns a viewer URL in its health or
open-tab response, run `node scripts/test-camofox-live-url.mjs`. The script
opens a temporary `example.com` tab using a random test identity and cleans it
up afterward. It does not probe undocumented viewer routes or establish that a
returned link is private; verify user isolation before sharing a viewer URL.

To test screenshot capture against the configured service, run
`node scripts/test-camofox-screenshot.mjs`. It opens `example.com`, validates
the screenshot content type and image signature, and cleans up its temporary
tab and session. Pass an output path to keep a copy for visual inspection:
`node scripts/test-camofox-screenshot.mjs /tmp/camofox-check.png`.

To verify access-key enforcement, run
`node scripts/test-camofox-access-key.mjs`. It checks that `/health` works
without a key, `/tabs?userId=test` rejects a missing key with 401, and the same
request succeeds with the configured key. To smoke-test browser actions, run
`node scripts/test-camofox.mjs`; it opens a temporary tab, navigates to
`https://example.com`, takes a snapshot, then closes the tab and session.
To test a single search macro, add its name, for example
`node scripts/test-camofox.mjs --macro @google_search`. To test every supported
macro, run `node scripts/test-camofox.mjs --macros`. Macro tests use a fresh
temporary tab per macro and verify that navigation reaches a different URL
with a readable snapshot. The request timeout defaults to 30 seconds; adjust
it with `--timeout-ms 60000` if needed.

To probe the noVNC viewer, set `CAMOFOX_NOVNC_URL` to the separate Railway
public domain for port 6080, then run `node scripts/test-camofox-vnc.mjs`.
The VNC status API requires the access key; the viewer is tested without
sending that key because browsers cannot attach the service authorization
header. noVNC may expose the shared browser display, so a reachable URL is not
proof of user isolation and must not be shared until access is restricted.

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

## Voice: Deepgram (optional)

`DEEPGRAM_API_KEY` enables voice in web chat. The dictation button records a clip, transcribes it on the server through `POST /api/voice/transcribe`, and places the text in the composer for review. `POST /api/voice/speak` returns MP3 audio for a reply. Without the key, dictation shows an error. iMessage voice notes are not transcribed yet; they get a reply saying only text is supported.

## iMessage: Photon 2.0 Beta (optional)

Set `PHOTON_PROJECT_ID` (the `pho_prj_…` ID) and `PHOTON_API_KEY` (a project key with `project:read` and `project:write`) on the eve service. This switches iMessage to `agent/channels/imessage.ts`, which replies through `api.photon.codes` (`@photon-ai/api`), and disables the Eve Photon channel so messages are not answered twice.

Inbound: `POST /imessage/webhook` verifies each delivery with the Standard Webhooks scheme (`webhook-id`, `webhook-timestamp`, `webhook-signature`, HMAC-SHA256) using `PHOTON_WEBHOOK_SIGNING_SECRET`. Verification failures return 400. The route returns 204 only after eve accepts the message, and 503 otherwise so Photon retries. Create the webhook destination with `apiVersion` `2026-07-01`, `enabledEvents` `["message.received"]`, and the public URL `https://<eve-domain>/imessage/webhook`.

Replies need no stored state. The conversation's Space ID and the agent's User ID are carried in the conversation address, so they survive restarts. The same address is saved as the user's iMessage delivery target for proactive messages.

What the agent reads: text; photos (passed to the model as images, up to 10 MB); and voice notes. A voice note uses Photon's transcript when it includes one, otherwise it is transcribed with Deepgram, so set `DEEPGRAM_API_KEY` on the eve service as well. Other attachments get a reply saying they aren't supported. Replies are threaded under the latest message, and inbound messages are marked read. Group conversations are not handled yet.
