import { defineTool } from "eve/tools";
import { z } from "zod";
import { submitGrowthReview } from "../lib/growth-engine.js";

export default defineTool({
  description:
    "Submit a quality review / rating for a previously executed Growth Engine call using its Call ID. Helps Treg track provider reliability and tool accuracy.",
  inputSchema: z.object({
    callId: z
      .string()
      .describe("The unique Treg Call ID (from callId in result or X-Treg-Call-Id header) to review."),
    usefulness: z
      .enum(["useful", "partly", "not_useful", "not_sure"])
      .describe("Rating of how useful or accurate the tool call was."),
    reason: z
      .string()
      .optional()
      .describe("Optional short feedback or explanation of why the call was rated this way."),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    callId: z.string(),
    reviewId: z.string().optional(),
    message: z.string().optional(),
    error: z.string().optional(),
  }),
  async execute({ callId, usefulness, reason }, ctx) {
    try {
      const res = await submitGrowthReview({
        callId,
        usefulness,
        reason,
        signal: ctx.abortSignal,
      });

      if (!res.success) {
        return {
          success: false,
          callId,
          error: res.error,
        };
      }

      return {
        success: true,
        callId,
        reviewId: res.reviewId,
        message: "Review successfully submitted to Treg.",
      };
    } catch (error) {
      if (ctx.abortSignal.aborted) throw error;
      return {
        success: false,
        callId,
        error: error instanceof Error ? error.message : `Failed to submit review for call '${callId}'`,
      };
    }
  },
});
