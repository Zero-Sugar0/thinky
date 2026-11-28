import { defineAgent } from "eve";

export default defineAgent({
  description:
    "Browse public web pages in the user's private browser space: open pages, read and extract content, take screenshots, and hand the tab to the user for sign-in or challenges.",
  model: "anthropic/claude-haiku-5.5",
});
