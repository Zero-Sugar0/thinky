import { defineTool } from "eve/tools";
import { z } from "zod";
import { markGrowthCall } from "../../../lib/growth-engine.js";

const markItemSchema = z.object({
  index: z.number().int().nonnegative().optional(),
  field: z.string().optional(),
  verdict: z.enum([
    "correct",
    "wrong",
    "stale",
    "wrong_entity",
    "missing",
    "irrelevant",
    "duplicate",
    "other",
  ]),
});

export default defineTool({
  description:
    "Privately mark a Growth Engine call result after later evidence confirms it was correct, wrong, stale, or otherwise inaccurate. Use only after checking the result; this does not change charges.",
  inputSchema: z.object({
    callId: z.string().min(1).describe("The Treg call ID to mark."),
    basis: z.enum(["bounced", "cross_checked", "user_said", "impression"]),
    items: z.array(markItemSchema).min(1).max(200),
    checked: z.number().int().nonnegative().optional(),
    evidenceCallId: z.string().optional(),
    note: z.string().min(1).max(500).optional(),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    callId: z.string(),
    markId: z.string().optional(),
    status: z.string().optional(),
    error: z.string().optional(),
  }),
  async execute({ callId, basis, items, checked, evidenceCallId, note }, ctx) {
    try {
      return await markGrowthCall(
        { callId, basis, items, checked, evidenceCallId, note },
        ctx.abortSignal,
      );
    } catch (error) {
      if (ctx.abortSignal.aborted) throw error;
      return {
        success: false,
        callId,
        error: error instanceof Error ? error.message : "Failed to mark Growth Engine result",
      };
    }
  },
});
