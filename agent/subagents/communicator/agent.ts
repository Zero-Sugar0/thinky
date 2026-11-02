import { defineAgent } from "eve";

export default defineAgent({
  description:
    "Draft and refine emails, messages, and other user communications to fit the requested audience, intent, and tone.",
  model: "anthropic/claude-haiku-5.5",
});
