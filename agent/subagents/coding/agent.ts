import { defineAgent } from "eve";

export default defineAgent({
  description:
    "Write, review, debug, and explain code. Works in the agent's sandbox to read files, run commands and tests, and make scoped changes.",
  model: "anthropic/claude-haiku-5.5",
});
