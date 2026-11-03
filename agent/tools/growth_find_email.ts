import { defineTool } from "eve/tools";
import { z } from "zod";
import { callGrowthTool } from "../lib/growth-engine.js";

export default defineTool({
  description:
    "Direct 1-shot tool to find a professional work email for a person by name and company domain, or LinkedIn URL, with optional automatic live mailbox verification.",
  inputSchema: z.object({
    firstName: z.string().optional().describe("Prospect first name, e.g. 'Satya'."),
    lastName: z.string().optional().describe("Prospect last name, e.g. 'Nadella'."),
    fullName: z.string().optional().describe("Prospect full name, e.g. 'Satya Nadella'."),
    domain: z.string().optional().describe("Company website domain, e.g. 'microsoft.com'."),
    linkedinUrl: z.string().optional().describe("Prospect's LinkedIn profile URL if known."),
    verifyEmail: z
      .boolean()
      .optional()
      .default(true)
      .describe("If true, automatically verifies mailbox deliverability in the same call."),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    email: z.string().optional(),
    verified: z.boolean().optional(),
    domainMatch: z.boolean().optional(),
    verificationVerdict: z.string().optional(),
    servedBy: z.string().optional(),
    costUsd: z.number().optional(),
    data: z.unknown().optional(),
    error: z.string().optional(),
  }),
  async execute({ firstName, lastName, fullName, domain, linkedinUrl, verifyEmail }, ctx) {
    try {
      const customerId = ctx.session?.auth?.current?.principalId;

      const payload: Record<string, unknown> = {};
      if (firstName) payload.first_name = firstName;
      if (lastName) payload.last_name = lastName;
      if (fullName) payload.full_name = fullName;
      if (domain) payload.domain = domain;
      if (linkedinUrl) payload.linkedin_url = linkedinUrl;

      const extraHeaders: Record<string, string> = {};
      if (verifyEmail) {
        extraHeaders["X-Treg-Route-Verify"] = "true";
      }

      const result = await callGrowthTool({
        toolId: "treg.people.email.find",
        method: "POST",
        data: payload,
        extraHeaders,
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

      let email: string | undefined;
      let verified: boolean | undefined;
      let verificationVerdict: string | undefined;

      if (result.data && typeof result.data === "object") {
        const body = result.data as Record<string, unknown>;
        const output = (body.output || body) as Record<string, unknown>;
        email = (output.email || output.work_email || body.email) as string | undefined;
        verified = output.verified as boolean | undefined;

        const tregMeta = (body._treg as Record<string, unknown>) || {};
        const verification = tregMeta.verification as Record<string, unknown> | undefined;
        if (verification) {
          verificationVerdict = verification.verdict as string | undefined;
          if (verificationVerdict === "valid") verified = true;
          else if (verificationVerdict === "invalid") verified = false;
        }
      }

      return {
        success: true,
        email,
        verified,
        domainMatch: result.domainMatch,
        verificationVerdict,
        servedBy: result.servedBy,
        costUsd: result.costUsd,
        data: result.data,
      };
    } catch (error) {
      if (ctx.abortSignal.aborted) throw error;
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to find email",
      };
    }
  },
});
