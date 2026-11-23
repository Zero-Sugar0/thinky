import { defineTool } from "eve/tools";
import { z } from "zod";
import { listGrowthTools } from "../lib/growth-engine.js";

export default defineTool({
  description:
    "List tools registered by the team in Growth Engine/Treg. Use this to check for the team's own connected providers and custom APIs before searching or choosing a paid catalog endpoint.",
  inputSchema: z.object({}),
  outputSchema: z.object({
    success: z.boolean(),
    tools: z.array(z.record(z.string(), z.unknown())),
    error: z.string().optional(),
  }),
  async execute(_input, ctx) {
    try {
      return await listGrowthTools(ctx.abortSignal);
    } catch (error) {
      if (ctx.abortSignal.aborted) throw error;
      return {
        success: false,
        tools: [],
        error: error instanceof Error ? error.message : "Failed to list team tools",
      };
    }
  },
});
