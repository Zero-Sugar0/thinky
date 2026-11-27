import { defineAgent } from "eve";

export default defineAgent({
  description:
    "Analyze budgets, expenses, and financial options; explain assumptions and comparisons clearly.",
  model: "anthropic/claude-haiku-5.5",
});
