import { defineTool } from "eve/tools";
import { z } from "zod";
import { callGrowthTool } from "../lib/growth-engine.js";

export default defineTool({
  description:
    "Direct 1-shot tool to search and discover B2B leads and prospects by criteria (job titles, industries, company domains, seniority, or locations) across verified data providers.",
  inputSchema: z.object({
    jobTitles: z
      .array(z.string())
      .optional()
      .describe("Target job titles, e.g. ['Head of Marketing', 'VP Sales', 'CTO']."),
    companyDomains: z
      .array(z.string())
      .optional()
      .describe("Target company domains, e.g. ['stripe.com', 'airbnb.com']."),
    industries: z
      .array(z.string())
      .optional()
      .describe("Target industry sectors, e.g. ['Information Technology & Services', 'Software']."),
    seniority: z
      .array(z.string())
      .optional()
      .describe("Seniority levels, e.g. ['executive', 'director', 'manager']."),
    countries: z
      .array(z.string())
      .optional()
      .describe("Country names or ISO codes, e.g. ['United States', 'United Kingdom']."),
    limit: z
      .number()
      .int()
      .min(1)
      .max(50)
      .optional()
      .default(10)
      .describe("Number of prospect leads to retrieve (default 10, max 50)."),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    costUsd: z.number().optional(),
    servedBy: z.string().optional(),
    leads: z.array(z.record(z.string(), z.unknown())).optional(),
    raw: z.unknown().optional(),
    error: z.string().optional(),
  }),
  async execute({ jobTitles, companyDomains, industries, seniority, countries, limit }, ctx) {
    try {
      const customerId = ctx.session?.auth?.current?.principalId;

      const payload: Record<string, unknown> = {
        limit: limit || 10,
      };

      if (jobTitles && jobTitles.length > 0) payload.job_titles = jobTitles;
      if (companyDomains && companyDomains.length > 0) payload.company_domains = companyDomains;
      if (industries && industries.length > 0) payload.industries = industries;
      if (seniority && seniority.length > 0) payload.seniority = seniority;
      if (countries && countries.length > 0) payload.countries = countries;

      const result = await callGrowthTool({
        toolId: "treg.people.search",
        method: "POST",
        data: payload,
        customerId,
        signal: ctx.abortSignal,
      });

      if (!result.success) {
        return {
          success: false,
          costUsd: result.costUsd,
          servedBy: result.servedBy,
          error: result.error,
        };
      }

      let leads: Array<Record<string, unknown>> = [];
      if (result.data && typeof result.data === "object") {
        const body = result.data as Record<string, unknown>;
        if (Array.isArray(body.output)) {
          leads = body.output as Array<Record<string, unknown>>;
        } else if (Array.isArray(body.people)) {
          leads = body.people as Array<Record<string, unknown>>;
        } else if (Array.isArray(body.records)) {
          leads = body.records as Array<Record<string, unknown>>;
        } else if (Array.isArray(body.leads)) {
          leads = body.leads as Array<Record<string, unknown>>;
        } else if (body.output && typeof body.output === "object") {
          const outObj = body.output as Record<string, unknown>;
          if (Array.isArray(outObj.people)) leads = outObj.people as Array<Record<string, unknown>>;
          else if (Array.isArray(outObj.records)) leads = outObj.records as Array<Record<string, unknown>>;
        }
      }

      return {
        success: true,
        costUsd: result.costUsd,
        servedBy: result.servedBy,
        leads,
        raw: result.data,
      };
    } catch (error) {
      if (ctx.abortSignal.aborted) throw error;
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to find leads",
      };
    }
  },
});
