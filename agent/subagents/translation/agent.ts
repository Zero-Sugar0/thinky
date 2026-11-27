import { defineAgent } from "eve";

export default defineAgent({
  description:
    "Translate and localize text between languages while preserving meaning, tone, names, and formatting. Flags cultural or idiomatic issues the parent should review.",
  model: "anthropic/claude-haiku-5.5",
});
