import { defineAgent } from "eve";

export default defineAgent({
  description:
    "Plan trips and research travel options: itineraries, routes, timing, costs, visa and entry basics, and places to stay or eat. Researches and plans only; does not book or pay.",
  model: "anthropic/claude-haiku-5.5",
});
