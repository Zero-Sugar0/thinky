import { defineMemory } from "eve/memory";
import { fileMemory } from "eve/memory/file";
import { byPrincipal } from "eve/memory/scope";

export default defineMemory({
  description:
    "The caller's profile: preferences, likes and dislikes, routines, working style, people and places that matter to them, and stable personal or professional facts. Not for tasks (use task tools) or standing behavior rules (use rules).",
  provider: fileMemory({ maxCharacters: 12_000 }),
  scope: byPrincipal,
});
