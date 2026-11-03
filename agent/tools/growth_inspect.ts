import { defineTool } from "eve/tools";
import { z } from "zod";
import { inspectGrowthEndpoint } from "../lib/growth-engine.js";

export default defineTool({
  description:
    "Inspect parameters, pricing, schemas, and ready-to-call examples for a specific Growth Engine tool by ID before calling it.",
  inputSchema: z.object({
    toolId: z
      .string()
      .describe(
        "The tool endpoint ID discovered from growth_search (e.g. 'treg.people.email.find', 'treg.companies.similar', 'treg.google.serp.organic').",
      ),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    toolId: z.string(),
    endpoint: z
      .object({
        id: z.string(),
        name: z.string().optional(),
        provider: z.string().optional(),
        summary: z.string().optional(),
        method: z.string().optional(),
        path: z.string().optional(),
        kind: z.string().optional(),
        cost: z
          .object({
            type: z.string().optional(),
            usd: z.number().optional(),
            unit: z.string().optional(),
            note: z.string().optional(),
          })
          .optional(),
        input: z.record(z.string(), z.unknown()).optional(),
        callTemplate: z.string().optional(),
      })
      .optional(),
    routingPlan: z.unknown().optional(),
    siblings: z
      .array(
        z.object({
          id: z.string(),
          provider: z.string().optional(),
          costUsd: z.number().optional(),
          params: z.array(z.string()).optional(),
        }),
      )
      .optional(),
    relatedCapabilities: z
      .array(
        z.object({
          endpointId: z.string(),
          capability: z.string(),
          does: z.string(),
        }),
      )
      .optional(),
    hints: z.array(z.string()).optional(),
    error: z.string().optional(),
  }),
  async execute({ toolId }, ctx) {
    try {
      const data = await inspectGrowthEndpoint(toolId, ctx.abortSignal);
      const ep = data.endpoint;

      return {
        success: true,
        toolId,
        endpoint: ep
          ? {
              id: ep.id,
              name: ep.name,
              provider: ep.provider_display || ep.provider,
              summary: ep.summary,
              method: ep.method,
              path: ep.path,
              kind: ep.kind,
              cost: ep.cost
                ? {
                    type: ep.cost.type,
                    usd: ep.cost.usd,
                    unit: ep.cost.unit,
                    note: ep.cost.note,
                  }
                : undefined,
              input: ep.input,
              callTemplate: ep.call_template || data.callTemplate,
            }
          : undefined,
        routingPlan: data.routing,
        siblings: data.siblings?.map((s) => {
          const siblingObj = s as unknown as Record<string, unknown>;
          return {
            id: s.id,
            provider: s.provider_display || s.provider,
            costUsd: s.cost?.usd,
            params: Array.isArray(siblingObj.params)
              ? (siblingObj.params as string[])
              : undefined,
          };
        }),
        relatedCapabilities: data.relatedCapabilities?.map((r) => ({
          endpointId: r.endpoint_id,
          capability: r.capability,
          does: r.does,
        })),
        hints: data.hints,
      };
    } catch (error) {
      if (ctx.abortSignal.aborted) throw error;
      return {
        success: false,
        toolId,
        error: error instanceof Error ? error.message : `Failed to inspect endpoint '${toolId}'`,
      };
    }
  },
});
