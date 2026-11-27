import { defineAgent } from "eve";

export default defineAgent({
  description:
    "Draft and structure reports, memos, proposals, and other written documents. Organizes content, drafts sections, and produces the final file in the format requested.",
  model: "anthropic/claude-haiku-5.5",
});
