import { defineTool } from "eve/tools";
import { z } from "zod";
import { searchGrowthCatalog } from "../lib/growth-engine.js";

export default defineTool({
  description:
    "Search across 4,100+ specialized growth tools across 123+ providers for leads, SEO, backlinks, SERP data, email/phone verification, company enrichment, social media analysis, and web scraping. Searches by the job to be done.",
  inputSchema: z.object({
    query: z
      .string()
      .describe(
        "The job or capability you need done, e.g. 'find leads by job title and company', 'google serp keyword rankings', 'verify email address', 'enrich company by domain', 'find backlinks', 'scrape reddit posts'.",
      ),
    limit: z
      .number()
      .int()
      .min(1)
      .max(50)
      .optional()
      .default(10)
      .describe("Maximum number of tool candidates to return (default 10, max 50)."),
    sort: z
      .enum(["relevance", "newest"])
      .optional()
      .default("relevance")
      .describe("Sort order for results: 'relevance' or 'newest'."),
    addedWithinDays: z
      .number()
      .int()
      .positive()
      .optional()
      .describe("Filter to tools added within the last N days."),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    query: z.string(),
    total: z.number(),
    results: z.array(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        provider: z.string().optional(),
        summary: z.string().optional(),
        domain: z.string().optional(),
        platform: z.string().optional(),
        kind: z.string().optional(),
        costUsd: z.number().optional(),
        costNote: z.string().optional(),
        callTemplate: z.string().optional(),
        score: z.number().optional(),
        successRate: z.number().nullable().optional(),
        medianLatencyMs: z.number().nullable().optional(),
      }),
    ),
    hints: z.array(z.string()).optional(),
    error: z.string().optional(),
  }),
  async execute({ query, limit, sort, addedWithinDays }, ctx) {
    try {
      const data = await searchGrowthCatalog(
        {
          query,
          limit,
          sort,
          addedWithinDays,
        },
        ctx.abortSignal,
      );

      return {
        success: true,
        query: data.query,
        total: data.total,
        results: data.results.map((item) => ({
          id: item.id,
          name: item.name || item.id,
          provider: item.provider_display || item.provider,
          summary: item.summary,
          domain: item.domain,
          platform: item.platform_label || item.platform,
          kind: item.kind,
          costUsd: item.cost?.usd,
          costNote: item.cost?.note,
          callTemplate: item.call_template,
          score: item.score,
          successRate: item.observed?.ok_rate,
          medianLatencyMs: item.observed?.p50_ms,
        })),
        hints: data.hints,
      };
    } catch (error) {
      if (ctx.abortSignal.aborted) throw error;
      return {
        success: false,
        query,
        total: 0,
        results: [],
        error: error instanceof Error ? error.message : "Failed to search tools",
      };
    }
  },
});
