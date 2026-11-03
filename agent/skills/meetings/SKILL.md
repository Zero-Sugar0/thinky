---
name: meetings
description: Dispatch meeting recording bots to Zoom, Google Meet, Microsoft Teams, and Webex calls, monitor meeting progress, retrieve speaker transcripts, and generate executive summaries with action items using Recall.ai.
---

# Meeting Assistant Skill

Equips the agent with meeting bots and transcription capabilities powered by Recall.ai.

## Tools

- **`meeting_join`**: Dispatches a meeting bot to a video call URL immediately or at a scheduled time (`joinAt`).
- **`meeting_status`**: Queries the bot's current state (`in_waiting_room`, `in_call_recording`, `done`).
- **`meeting_transcript`**: Downloads and formats the speaker-grouped readable transcript after a meeting has ended.
- **`meeting_leave`**: Commands the bot to exit an active meeting call.

## Workflow

1. **Join Call**:
   When the user provides a meeting link (e.g. `https://meet.google.com/...` or `https://zoom.us/j/...`), call `meeting_join`:
   ```json
   {
     "meetingUrl": "https://meet.google.com/abc-defg-hij",
     "botName": "Thinky Assistant",
     "joinMessage": "Thinky Assistant has joined to take notes."
   }
   ```
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
- `PUBLIC_API_BASE_URL`: Stable public backend URL for webhooks.
