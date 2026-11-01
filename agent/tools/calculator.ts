import { defineTool } from "eve/tools";
import { z } from "zod";

export default defineTool({
  description: "Evaluate a basic arithmetic expression safely without external services",
  inputSchema: z.object({
    expression: z
      .string()
      .min(1)
      .max(200)
      .regex(/^[0-9+\-*/().%\s]+$/, "Only numbers and arithmetic operators are allowed")
      .describe("Arithmetic expression using numbers, parentheses, +, -, *, /, or %"),
  }),
  outputSchema: z.object({ result: z.number() }),
  async execute({ expression }) {
    const result = Function(`"use strict"; return (${expression})`)();
    if (typeof result !== "number" || !Number.isFinite(result)) {
      throw new Error("Expression did not produce a finite number");
    }
    return { result };
  },
});
