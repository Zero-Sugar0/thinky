import { defineTool } from "eve/tools";
import { z } from "zod";
import { getGrowthBalance } from "../lib/growth-engine.js";

export default defineTool({
  description:
    "Check remaining Growth Engine / Treg credit balance and spend status.",
  inputSchema: z.object({}),
  outputSchema: z.object({
    success: z.boolean(),
    balanceUsd: z.number().optional(),
    balanceMicro: z.number().optional(),
    data: z.unknown().optional(),
    error: z.string().optional(),
  }),
  async execute(_input, ctx) {
    try {
      const res = await getGrowthBalance(ctx.abortSignal);
      return res;
    } catch (error) {
      if (ctx.abortSignal.aborted) throw error;
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch balance",
      };
    }
  },
});
