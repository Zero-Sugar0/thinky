import { defineAgent } from "eve";

export default defineAgent({
  description:
    "Research questions across reliable sources, verify important claims, and return concise findings with citations.",
  model: "anthropic/claude-haiku-5.5",
});
