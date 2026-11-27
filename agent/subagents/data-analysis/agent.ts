import { defineAgent } from "eve";

export default defineAgent({
  description:
    "Analyze datasets, spreadsheets, and CSV or JSON files. Clean data, compute statistics, and produce charts and clear written findings.",
  model: "anthropic/claude-haiku-5.5",
});
