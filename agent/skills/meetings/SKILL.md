---
name: meetings
description: Join Zoom, Google Meet, Microsoft Teams, and Webex calls as a transparent speaking agent, monitor meeting progress, retrieve transcripts, and summarize decisions and action items using Recall.ai.
---

# Meeting Assistant Skill

Equips the agent with a speaking AI meeting facilitator powered by Gemini Live through Vercel AI Gateway, plus real-time and post-meeting Deepgram transcription through Recall.ai.

## Tools

- **`meeting_join`**: Joins a video call immediately or at a scheduled time (`joinAt`) as Thinky. The bot announces that it is an AI, speaks with participants, and helps guide the discussion.
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
   When the user asks Thinky to join and participate in a meeting, call `meeting_join` with the meeting link (e.g. `https://meet.google.com/...` or `https://zoom.us/j/...`). The bot joins transparently as an AI participant, introduces itself aloud, and contributes at natural pauses:
   ```json
   {
     "meetingUrl": "https://meet.google.com/abc-defg-hij",
     "botName": "Thinky",
     "joinMessage": "Thinky is an AI meeting facilitator. I’ll help guide the discussion and capture notes."
   }
   ```
   Do not describe it as a human attendee or a silent notetaker. It should listen, let participants finish, and keep spoken contributions brief and useful.
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
- `RECALL_WORKSPACE_VERIFICATION_SECRET`: Secret to verify webhook signatures.
- `PUBLIC_API_BASE_URL`: Stable, public HTTPS web app URL used by Recall to load the facilitator page.
- `AI_GATEWAY_API_KEY`: Vercel AI Gateway key for local or non-Vercel deployments; Vercel deployments can use Gateway's automatic OIDC authentication.
- `BETTER_AUTH_SECRET`: Must be the same on the web and Eve services to sign and verify facilitator session URLs.

The web and Eve services need `RECALL_API_KEY`, `PUBLIC_API_BASE_URL`, and the same `BETTER_AUTH_SECRET`. The web service also needs Vercel AI Gateway authentication to mint short-lived Gemini Live sessions. Recall Output Media supplies meeting audio to the facilitator webpage and sends its audio output back into the call. Configure Deepgram in the selected Recall region. Gemini Live handles conversational speech-to-speech directly, including turn detection and interruptions; Deepgram real-time transcript events and post-meeting transcript artifacts are separate from that live voice path.
