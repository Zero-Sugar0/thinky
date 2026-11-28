import { defineMemory } from "eve/memory";
import { fileMemory } from "eve/memory/file";
import { vercelBlob } from "eve/memory/file/vercel";
import { byPrincipal } from "eve/memory/scope";

export default defineMemory({
  description:
    "The caller's profile: preferences, likes and dislikes, routines, working style, people and places that matter to them, and stable personal or professional facts. Not for tasks (use task tools) or standing behavior rules (use rules).",
  // Explicit Blob backend on Vercel; local eve dev keeps the in-memory default.
  provider: fileMemory({
    maxCharacters: 12_000,
    ...(process.env.VERCEL ? { backend: vercelBlob() } : {}),
  }),
  scope: byPrincipal,
});
