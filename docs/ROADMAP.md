# Roadmap

Status of the platform build-out. **Done** means implemented and tested in this repo. **Partial** means the foundation exists but the feature is not complete. **Next** means planned, not started.

## Foundation

| Item | Status | Notes |
|------|--------|-------|
| Identity in version-controlled `SOUL.md` | Done | Loaded every turn. Not writable by users. |
| Operating playbook `INSTRUCTIONS.md` | Done | Read on demand with `identity_read`, one section per procedure. |
| `profile` memory slot (PROFILE) | Done | Raised to 12k characters, description covers preferences and likes. |
| `rules` memory slot (standing rules) | Done | Per-user, 8k characters. |
| Structured task store (`agent_tasks`) | Done | Table, internal API, `task_create`/`task_list`/`task_update` tools. |
| Action audit log (`agent_action_log`) | Done | Written by `composio_execute`. Arguments are never stored. |
| Tests for identity parsing | Done | `tests/identity.test.mjs`. |
| Structured memory beyond one document (search, consolidation) | Next | Current file memory rejects writes once full. Needs a provider with search, or a structured store. |

## Improvements to existing features

| Item | Status | Notes |
|------|--------|-------|
| Proactive suggestions to every channel | Partial | Web chat and Slack are delivered by QStash. Telegram is delivered once a chat is linked. iMessage needs an Eve channel handoff. |
| Proactive suggestions driven by tasks, not just memory and thread titles | Done | Overdue, due-soon, and stale tasks shape the check-in policy and wording. |
| Reminders at due time | Done | Tasks with `remindAt` are sent once by the QStash dispatcher, every minute. |
| Hard enforcement of standing rules | Partial | Rules are injected and the playbook says to apply them. Nothing checks an action against them before it runs. |
| Action log viewer in the app | Next | Data is recorded. Needs an internal endpoint and a page. |
| Undo for reversible actions | Next | Depends on each Composio toolkit. Needs per-action undo mapping. |
| Meeting follow-through (tasks from transcripts, owner nudges) | Partial | Playbook covers creating tasks after user agreement. Automatic nudges are not built. |
| Graceful degradation when Composio or Treg is not configured | Partial | Tools report errors. Consistent, friendly fallback text is not yet standardized. |
| Eval coverage | Next | `evals/` has greeting and calculator only. Needs memory, tasks, Composio, handoff, and delegation evals. |
| Model routing (small model for routine turns, larger for planning and research) | Next | Currently a single model in `agent/agent.ts`. |
| Per-user cost tracking | Next | Growth tools report `costUsd`. Model and tool spend are not aggregated. |

| Random, varied check-ins (important, undone task, follow-up, conversation, update) | Done | Pure policy in `server/utils/checkin-policy.ts`, with quiet hours, daily cap, cooldowns, and a random gate. |
| Composio trigger signals feed check-ins | Done | The Composio webhook records toolkit, trigger and time only. Message content is never stored. |
| Telegram account linking | Next | Telegram chats cannot be tied to a Thinky user yet. Needs a link-code flow like Slack's. |
| iMessage delivery from QStash | Next | Needs an Eve channel handoff reachable from a route, or an iMessage send API. |

## Extraordinary features

| Item | Status | Notes |
|------|--------|-------|
| Cross-channel continuity (one memory and task list across web, Slack, Telegram, iMessage) | Partial | Memory and tasks are per user, so they already follow the user across channels. Thread continuity across channels is not built. |
| Calendar-aware planning | Next | Via Composio calendar tools. Must confirm before creating or moving events. |
| Inbox triage and drafted replies | Next | Via Composio mail tools. Sending requires explicit confirmation. |
| Voice input and spoken replies | Next | Needs a voice channel and speech services. |
| Shared spaces (team or household memory and tasks) | Next | Needs a space model, membership, and per-person privacy boundaries. |
| Self-review before delivery | Next | Check drafted output against `rules` and `profile` before sending. |

## Notes

- Items marked Next that depend on external services (Composio, Recall.ai, Treg, QStash, speech) cannot be fully tested without those credentials configured.
- The vendored skill scripts under `agent/skills/` and the Camofox tools currently fail `pnpm lint`. These predate this work and are unrelated to it.
- Two existing tests fail on `main`: `camofox.test.mjs` (viewer link) and `recall.test.mjs`. They are unrelated to this work.
