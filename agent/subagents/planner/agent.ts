import { defineAgent } from "eve";

export default defineAgent({
  description:
    "Turn the user's commitments, tasks, and constraints into a realistic prioritized plan with clear next actions.",
  model: "anthropic/claude-haiku-5.5",
});
