import { defineTool } from "eve/tools";
import { z } from "zod";
import { callGrowthTool } from "../lib/growth-engine.js";

export default defineTool({
  description:
    "Direct 1-shot tool to fetch live Google search engine ranking results (organic SERP) for a search query.",
  inputSchema: z.object({
    query: z.string().describe("Search query, e.g. 'best ai agents 2026' or 'accounting software small business'."),
    country: z.string().optional().default("us").describe("Country code for search results, e.g. 'us', 'uk', 'de'."),
    language: z.string().optional().default("en").describe("Search language code, e.g. 'en', 'es', 'fr'."),
    limit: z.number().int().min(1).max(50).optional().default(10).describe("Number of search results to return."),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    query: z.string(),
    results: z
      .array(
        z.object({
          position: z.number().optional(),
          title: z.string().optional(),
          url: z.string().optional(),
          snippet: z.string().optional(),
        }),
      )
      .optional(),
    servedBy: z.string().optional(),
    costUsd: z.number().optional(),
    raw: z.unknown().optional(),
    error: z.string().optional(),
  }),
  async execute({ query, country, language, limit }, ctx) {
    try {
      const customerId = ctx.session?.auth?.current?.principalId;

      const result = await callGrowthTool({
        toolId: "treg.google.serp.organic",
        method: "POST",
        data: {
          query,
          country: country || "us",
          language: language || "en",
          limit: limit || 10,
        },
        customerId,
        signal: ctx.abortSignal,
      });

      if (!result.success) {
        return {
          success: false,
          query,
          costUsd: result.costUsd,
          servedBy: result.servedBy,
          error: result.error,
        };
      }

      let serpItems: Array<{ position?: number; title?: string; url?: string; snippet?: string }> = [];

      if (result.data && typeof result.data === "object") {
        const body = result.data as Record<string, unknown>;
        const output = (body.output || body) as Record<string, unknown>;
        const items = (output.organic || output.results || output.items || body.results) as Array<Record<string, unknown>> | undefined;

        if (Array.isArray(items)) {
          serpItems = items.map((it, idx) => ({
            position: (it.position as number) ?? idx + 1,
            title: (it.title || it.headline) as string | undefined,
            url: (it.url || it.link) as string | undefined,
            snippet: (it.snippet || it.description) as string | undefined,
          }));
        }
      }

      return {
        success: true,
        query,
        results: serpItems,
        servedBy: result.servedBy,
        costUsd: result.costUsd,
        raw: result.data,
      };
    } catch (error) {
      if (ctx.abortSignal.aborted) throw error;
      return {
        success: false,
        query,
        error: error instanceof Error ? error.message : "Failed to fetch SERP rankings",
      };
    }
  },
});
