import { defineTool } from "eve/tools";
import { z } from "zod";
import { callGrowthTool } from "../lib/growth-engine.js";

export default defineTool({
  description:
    "Direct 1-shot tool to verify an email address's validity and deliverability (checks MX, SMTP mailbox response, catch-all, disposable domain).",
  inputSchema: z.object({
    email: z.string().email().describe("The email address to verify, e.g. 'john@acme.com'."),
    decisive: z
      .boolean()
      .optional()
      .default(true)
      .describe("If true, falls forward across providers until a decisive verdict (valid/invalid) is reached."),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    email: z.string(),
    verdict: z.string().optional(),
    isValid: z.boolean().optional(),
    isCatchAll: z.boolean().optional(),
    isDisposable: z.boolean().optional(),
    score: z.number().optional(),
    servedBy: z.string().optional(),
    costUsd: z.number().optional(),
    raw: z.unknown().optional(),
    error: z.string().optional(),
  }),
  async execute({ email, decisive }, ctx) {
    try {
      const customerId = ctx.session?.auth?.current?.principalId;
      const extraHeaders: Record<string, string> = {};
      if (decisive) {
        extraHeaders["X-Treg-Route-Decisive"] = "true";
      }

      const result = await callGrowthTool({
        toolId: "treg.people.email.verify",
        method: "POST",
        data: { email },
        extraHeaders,
        customerId,
        signal: ctx.abortSignal,
      });

      if (!result.success) {
        return {
          success: false,
          email,
          costUsd: result.costUsd,
          servedBy: result.servedBy,
          error: result.error,
        };
      }

      let verdict: string | undefined;
      let isValid: boolean | undefined;
      let isCatchAll: boolean | undefined;
      let isDisposable: boolean | undefined;
      let score: number | undefined;

      if (result.data && typeof result.data === "object") {
        const body = result.data as Record<string, unknown>;
        const output = (body.output || body) as Record<string, unknown>;

        verdict = (output.verdict || output.status || body.verdict) as string | undefined;
        isValid = output.valid !== undefined ? (output.valid as boolean) : verdict === "valid";
        isCatchAll = (output.catch_all || output.is_catch_all) as boolean | undefined;
        isDisposable = (output.disposable || output.is_disposable) as boolean | undefined;
        score = output.score as number | undefined;
      }

      return {
        success: true,
        email,
        verdict,
        isValid,
        isCatchAll,
        isDisposable,
        score,
        servedBy: result.servedBy,
        costUsd: result.costUsd,
        raw: result.data,
      };
    } catch (error) {
      if (ctx.abortSignal.aborted) throw error;
      return {
        success: false,
        email,
        error: error instanceof Error ? error.message : "Failed to verify email",
      };
    }
  },
});
