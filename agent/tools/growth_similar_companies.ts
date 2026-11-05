import { defineTool } from "eve/tools";
import { z } from "zod";
import { callGrowthTool } from "../lib/growth-engine.js";

export default defineTool({
  description:
    "Direct 1-shot tool to discover competitor or lookalike companies given a target company domain.",
  inputSchema: z.object({
    domain: z.string().describe("Target company domain, e.g. 'linear.app', 'stripe.com', 'hubspot.com'."),
    limit: z.number().int().min(1).max(50).optional().default(10).describe("Maximum number of similar companies to return."),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    domain: z.string(),
    companies: z
      .array(
        z.object({
          domain: z.string().optional(),
          name: z.string().optional(),
          score: z.number().optional(),
          summary: z.string().optional(),
        }),
      )
      .optional(),
    servedBy: z.string().optional(),
    costUsd: z.number().optional(),
    raw: z.unknown().optional(),
    error: z.string().optional(),
  }),
  async execute({ domain, limit }, ctx) {
    try {
      const customerId = ctx.session?.auth?.current?.principalId;

      const result = await callGrowthTool({
        toolId: "treg.companies.similar",
        method: "POST",
        data: { domain, limit: limit || 10 },
        customerId,
        signal: ctx.abortSignal,
      });

      if (!result.success) {
        return {
          success: false,
          domain,
          costUsd: result.costUsd,
          servedBy: result.servedBy,
          error: result.error,
        };
      }

      let companies: Array<{ domain?: string; name?: string; score?: number; summary?: string }> = [];

      if (result.data && typeof result.data === "object") {
        const body = result.data as Record<string, unknown>;
        const output = (body.output || body) as Record<string, unknown>;
        const items = (output.companies || output.similar || output.results || body.companies) as Array<Record<string, unknown>> | undefined;

        if (Array.isArray(items)) {
          companies = items.map((c) => ({
            domain: (c.domain || c.website) as string | undefined,
            name: (c.name || c.company_name) as string | undefined,
            score: (c.score || c.similarity) as number | undefined,
            summary: (c.description || c.summary) as string | undefined,
          }));
        }
      }

      return {
        success: true,
        domain,
        companies,
        servedBy: result.servedBy,
        costUsd: result.costUsd,
        raw: result.data,
      };
    } catch (error) {
      if (ctx.abortSignal.aborted) throw error;
      return {
        success: false,
        domain,
        error: error instanceof Error ? error.message : "Failed to find similar companies",
      };
    }
  },
});
