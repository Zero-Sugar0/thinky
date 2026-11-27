---
name: meetings
description: Join Zoom, Google Meet, Microsoft Teams, and Webex calls as a transparent speaking agent, monitor meeting progress, retrieve transcripts, and summarize decisions and action items using Recall.ai.
---

# Meeting Assistant Skill

Equips the agent with a live, speaking AI participant powered by Recall.ai’s native Deepgram Voice Agent integration, plus real-time and post-meeting transcription through Recall.ai.

## Tools

- **`meeting_join`**: Joins a video call immediately or at a scheduled time (`joinAt`) as Thinky. It announces that it is an AI participant, listens to the live conversation, and speaks briefly when addressed or when it can materially help.
- **`meeting_status`**: Queries the bot's current state (`in_waiting_room`, `in_call_recording`, `done`).
- **`meeting_transcript`**: Downloads and formats the speaker-grouped readable transcript after a meeting has ended.
- **`meeting_leave`**: Commands the bot to exit an active meeting call.

`meeting_join` enables Deepgram real-time transcription by default. Recall sends
finalized `transcript.data` utterances to Thinky's verified
`/api/webhooks/recall` endpoint. The webhook acknowledges events and handles
Recall lifecycle and transcript-artifact events; use `meeting_transcript` for
the complete saved transcript after the call.

## Workflow

1. **Join Call**:
   When the user asks Thinky to join and participate in a meeting, call `meeting_join` with the meeting link (e.g. `https://meet.google.com/...` or `https://zoom.us/j/...`). Pass a concise, non-sensitive meeting brief only when it is relevant and based on facts or priorities explicitly shared for that call; never include secrets or unrelated profile details. The bot joins transparently as an AI participant, introduces itself aloud, and contributes at natural transitions:
   ```json
   {
     "meetingUrl": "https://meet.google.com/abc-defg-hij",
     "botName": "Thinky",
     "joinMessage": "Thinky is an AI participant. This call is being recorded for a transcript and follow-up; I can help when useful.",
     "meetingContext": "Optional concise goals and user priorities explicitly shared for this call."
   }
   ```
   Do not describe Thinky as a human attendee or a silent notetaker. It should listen to the full discussion and proactively contribute a concise clarification, synthesis, or focused question when it can materially help—even if no one has addressed it—at a natural transition and without interrupting. Keep turns concise and stay quiet when the group is progressing without it. Represent the user's perspective only from relevant facts and priorities explicitly provided for that meeting; never fabricate views or commitments.
2. **Monitor**:
   Check if the bot was admitted into the meeting via `meeting_status`:
   ```json
   { "botId": "bot_123" }
   ```
3. **Summarize Post-Call**:
   Once `done`, call `meeting_transcript`:
   ```json
   { "botId": "bot_123" }
   ```
   Synthesize the readable transcript into:
   - Summary of decisions
   - Key discussion points
   - Action items with owners

## Requirements

- `RECALL_API_KEY`: API key from the chosen Recall region.
- `RECALL_REGION`: `us-west-2` (default), `us-east-1`, `eu-central-1`, or `ap-northeast-1`.
- A Deepgram Voice Agent credential saved in the same Recall workspace and region. The bot uses Deepgram Nova-3 for listening and Aura-2 Thalia for speaking; Recall's Voice Agent integration uses OpenAI `gpt-4o-mini` for reasoning.
- `RECALL_WORKSPACE_VERIFICATION_SECRET`: Secret to verify webhook signatures.
- `PUBLIC_API_BASE_URL`: Stable, public HTTPS app URL receiving Recall transcript and lifecycle webhooks.

Set `RECALL_API_KEY` on both the web and Eve services if both can create bots. Set `PUBLIC_API_BASE_URL` on each service that creates bots. The web service also needs `RECALL_WORKSPACE_VERIFICATION_SECRET` to verify incoming callbacks. Save the Deepgram credential under Agents → Deepgram in the matching Recall region; do not send provider API keys in bot requests. The live call audio is sent to Deepgram through `output_media.audio`, which handles recognition, reasoning, and spoken replies without a custom webpage or Vercel AI Gateway. A generated 16:9 JPEG is supplied through `automatic_video_output` as Thinky's in-call video avatar. Deepgram real-time transcript events and post-meeting transcript artifacts remain separately configured for saved transcripts.
