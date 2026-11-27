import { defineMemory } from "eve/memory";
import { fileMemory } from "eve/memory/file";
import { byPrincipal } from "eve/memory/scope";

export default defineMemory({
  description:
    "Standing rules the caller has set for how you should behave in future (e.g. 'always reply briefly', 'never book before 10am', 'check in on Fridays'). Apply them without being asked again.",
  provider: fileMemory({ maxCharacters: 8_000 }),
  scope: byPrincipal,
});
