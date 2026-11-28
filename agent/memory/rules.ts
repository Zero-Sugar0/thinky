import { defineMemory } from "eve/memory";
import { fileMemory } from "eve/memory/file";
import { vercelBlob } from "eve/memory/file/vercel";
import { byPrincipal } from "eve/memory/scope";

export default defineMemory({
  description:
    "Standing rules the caller has set for how you should behave in future (e.g. 'always reply briefly', 'never book before 10am', 'check in on Fridays'). Apply them without being asked again.",
  // Explicit Blob backend on Vercel; local eve dev keeps the in-memory default.
  provider: fileMemory({
    maxCharacters: 8_000,
    ...(process.env.VERCEL ? { backend: vercelBlob() } : {}),
  }),
  scope: byPrincipal,
});
