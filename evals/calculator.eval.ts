import { defineEval } from "eve/evals";
import { includes } from "eve/evals/expect";

export default defineEval({
  description: "The agent uses its calculator and reports the correct result.",
  async test(t) {
    await t.send("Use your calculator tool to compute 19 * 23. Give me only the number.");
    t.succeeded();
    t.calledTool("calculator", { output: { result: 437 } });
    t.check(t.reply, includes("437"));
  },
});
