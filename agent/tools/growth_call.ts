import { defineTool } from "eve/tools";
import { z } from "zod";
import { callGrowthTool } from "../lib/growth-engine.js";

export default defineTool({
  description:
    "Execute any tool in the Growth Engine catalog by its tool ID (e.g., 'treg.people.email.find', 'treg.people.search', 'treg.google.serp.organic', 'treg.companies.enrich'). Returns provider results and settled cost tracking.",
  inputSchema: z.object({
    toolId: z
      .string()
      .describe(
        "The tool endpoint ID to call, discovered from growth_search or growth_inspect.",
      ),
    method: z
      .enum(["GET", "POST", "PUT", "DELETE"])
      .optional()
      .describe("HTTP method to use. Defaults to POST if data is provided, otherwise GET."),
    query: z
      .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
      .optional()
      .describe("Query parameters to pass to the endpoint (for GET requests or query strings)."),
    data: z
      .record(z.string(), z.unknown())
      .optional()
      .describe("JSON body data to send to the endpoint (for POST/PUT requests)."),
    maxCostUsd: z
      .number()
      .positive()
      .optional()
      .describe("Optional spending ceiling in USD for this call (e.g. 0.50). Refuses call if reservation exceeds it."),
    idempotencyKey: z
      .string()
      .optional()
      .describe("Optional unique idempotency key to prevent paying twice on retries (cached for 24h)."),
    awaitAsync: z
      .boolean()
      .optional()
      .default(false)
      .describe("If true, automatically polls asynchronous generation tasks (video-gen, image-gen, 202 status) until completion."),
    asyncTimeoutSeconds: z
      .number()
      .int()
      .positive()
      .optional()
      .describe("Maximum seconds to wait for asynchronous polling (default 180s)."),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    toolId: z.string(),
    httpStatus: z.number(),
    servedBy: z.string().optional(),
    costUsd: z.number().optional(),
    costMicro: z.number().optional(),
    callId: z.string().optional(),
    cached: z.boolean().optional(),
    replayed: z.boolean().optional(),
    domainMatch: z.boolean().optional(),
    data: z.unknown().optional(),
    error: z.string().optional(),
  }),
  async execute({ toolId, method, query, data, maxCostUsd, idempotencyKey, awaitAsync, asyncTimeoutSeconds }, ctx) {
    try {
      const customerId = ctx.session?.auth?.current?.principalId;

      const result = await callGrowthTool({
        toolId,
        method,
        query,
        data,
        maxCostUsd,
        idempotencyKey,
        awaitAsync,
        asyncTimeoutSeconds,
        customerId,
        signal: ctx.abortSignal,
      });

      return {
        success: result.success,
        toolId: result.toolId,
        httpStatus: result.httpStatus,
        servedBy: result.servedBy,
        costUsd: result.costUsd,
        costMicro: result.costMicro,
        callId: result.callId,
        cached: result.cached,
        replayed: result.replayed,
        domainMatch: result.domainMatch,
        data: result.data,
        error: result.error,
      };
    } catch (error) {
      if (ctx.abortSignal.aborted) throw error;
      return {
        success: false,
        toolId,
        httpStatus: 500,
        error: error instanceof Error ? error.message : `Failed to execute tool '${toolId}'`,
      };
    }
  },
});
