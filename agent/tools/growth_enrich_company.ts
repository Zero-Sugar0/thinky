import { defineTool } from "eve/tools";
import { z } from "zod";
import { callGrowthTool } from "../lib/growth-engine.js";

export default defineTool({
  description:
    "Direct 1-shot tool to enrich a company profile by domain or name (returns employee count, technologies, funding, industry, and description).",
  inputSchema: z.object({
    domain: z.string().describe("The company domain, e.g. 'stripe.com' or 'figma.com'."),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    domain: z.string(),
    companyName: z.string().optional(),
    industry: z.string().optional(),
    employeeCount: z.number().optional(),
    description: z.string().optional(),
    technologies: z.array(z.string()).optional(),
    funding: z.string().optional(),
    servedBy: z.string().optional(),
    costUsd: z.number().optional(),
    raw: z.unknown().optional(),
    error: z.string().optional(),
  }),
  async execute({ domain }, ctx) {
    try {
      const customerId = ctx.session?.auth?.current?.principalId;

      const result = await callGrowthTool({
        toolId: "treg.companies.enrich",
        method: "POST",
        data: { domain },
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

      let companyName: string | undefined;
      let industry: string | undefined;
      let employeeCount: number | undefined;
      let description: string | undefined;
      let technologies: string[] | undefined;
      let funding: string | undefined;

      if (result.data && typeof result.data === "object") {
        const body = result.data as Record<string, unknown>;
        const output = (body.output || body) as Record<string, unknown>;

        companyName = (output.name || output.company_name || body.name) as string | undefined;
        industry = (output.industry || output.category) as string | undefined;
        employeeCount = (output.employees || output.employee_count || output.headcount) as number | undefined;
        description = (output.description || output.summary) as string | undefined;
        funding = (output.funding || output.funding_stage || output.total_funding) as string | undefined;

        if (Array.isArray(output.technologies)) {
          technologies = output.technologies as string[];
        } else if (Array.isArray(output.tech_stack)) {
          technologies = output.tech_stack as string[];
        }
      }

      return {
        success: true,
        domain,
        companyName,
        industry,
        employeeCount,
        description,
        technologies,
        funding,
        servedBy: result.servedBy,
        costUsd: result.costUsd,
        raw: result.data,
      };
    } catch (error) {
      if (ctx.abortSignal.aborted) throw error;
      return {
        success: false,
        domain,
        error: error instanceof Error ? error.message : "Failed to enrich company",
      };
    }
  },
});
