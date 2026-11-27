import { defineAgent } from "eve";

export default defineAgent({
  description:
    "Check the accuracy, consistency, and completeness of another agent's output or a document before it reaches the user. Reports problems; does not rewrite the work.",
  model: "anthropic/claude-haiku-5.5",
});
