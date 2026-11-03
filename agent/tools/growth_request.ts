import { defineTool } from "eve/tools";
import { z } from "zod";
import { submitGrowthFeedback } from "../lib/growth-engine.js";

export default defineTool({
  description:
    "Request a missing tool/capability or report friction/issues to Growth Engine / Treg when a desired data source or provider is not currently in the catalog.",
  inputSchema: z.object({
    need: z
      .string()
      .describe(
        "Description of the capability or data tool needed, e.g. 'Crunchbase investor search API' or 'Trustpilot reviews scraper'.",
      ),
    category: z
      .enum(["other", "friction", "quality", "pricing"])
      .optional()
      .default("other")
      .describe("Category of feedback/request."),
    endpointId: z.string().optional().describe("Optional catalog endpoint ID if reporting an existing tool."),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    feedbackId: z.string().optional(),
    message: z.string().optional(),
    error: z.string().optional(),
  }),
  async execute({ need, category, endpointId }, ctx) {
    try {
      const res = await submitGrowthFeedback({
        category: category || "other",
        message: need,
        endpointId,
        signal: ctx.abortSignal,
      });

      if (!res.success) {
        return {
          success: false,
          error: res.error,
        };
      }

      return {
        success: true,
        feedbackId: res.feedbackId,
        message: "Request successfully recorded. Treg uses these submissions to steer which tools are added next.",
      };
    } catch (error) {
      if (ctx.abortSignal.aborted) throw error;
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to submit tool request",
      };
    }
  },
});
