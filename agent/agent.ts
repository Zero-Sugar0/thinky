import { defineAgent } from "eve";

export default defineAgent({
  model: "anthropic/claude-haiku-5.5",
  modelOptions: {
    providerOptions: {
      anthropic: {
        // Claude 5 thinks adaptively on its own but omits the reasoning text
        // by default, which would render as an empty "Thinking…" block.
        thinking: { type: "adaptive", display: "summarized" },
      },
    },
  },
  // Compact earlier than the 0.9 default so each request carries less history.
  // Summaries run on a low-cost summarization model through AI Gateway.
  compaction: {
    model: "scaledown/scaledown-summarize-1",
    thresholdPercent: 0.6,
  },
  // Default is 40M input tokens per session. Cap long-lived chats well below that.
  limits: {
    maxInputTokensPerSession: 3_000_000,
    maxOutputTokensPerSession: 300_000,
  build: {
    externalDependencies: ["@daytonaio/sdk"],
  },
});
