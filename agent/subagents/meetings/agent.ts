import { defineAgent } from "eve";

export default defineAgent({
  description:
    "Meeting assistant specialist. Dispatches meeting recording bots to Zoom, Google Meet, Teams, or Webex calls, retrieves speaker transcripts, summarizes discussions, and extracts clear action items.",
  model: "anthropic/claude-haiku-5.5",
});
