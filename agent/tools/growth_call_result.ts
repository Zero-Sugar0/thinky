import { defineTool } from "eve/tools";
import { z } from "zod";
import { getGrowthCallResult } from "../lib/growth-engine.js";

export default defineTool({
  description:
    "Retrieve the stored result of a previous successful Growth Engine catalog call by its Call ID. Use this to recover paid data that was discarded or lost without paying again.",
  inputSchema: z.object({
    callId: z
      .string()
      .describe("The unique Treg Call ID (e.g. from previous growth_call result) to retrieve."),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    callId: z.string(),
    data: z.unknown().optional(),
    costUsd: z.number().optional(),
    costMicro: z.number().optional(),
    error: z.string().optional(),
  }),
  async execute({ callId }, ctx) {
    try {
      const res = await getGrowthCallResult(callId, ctx.abortSignal);
      return res;
    } catch (error) {
      if (ctx.abortSignal.aborted) throw error;
      return {
        success: false,
        callId,
        error: error instanceof Error ? error.message : `Failed to retrieve call result for '${callId}'`,
      };
    }
  },
});
