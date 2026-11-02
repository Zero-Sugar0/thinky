import { defineEval } from "eve/evals";
import { includes } from "eve/evals/expect";

export default defineEval({
  description: "A greeting gets a brief response without unnecessary tool calls.",
  async test(t) {
    await t.send("Say hello to me in one sentence.");
    t.succeeded();
    t.usedNoTools();
    t.check(t.reply, includes(/hello|hi/i));
  },
});
