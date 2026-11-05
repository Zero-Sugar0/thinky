import { defineTool } from "eve/tools";
import { z } from "zod";
import { callGrowthTool } from "../lib/growth-engine.js";

export default defineTool({
  description:
    "Direct 1-shot tool to find a direct phone number for a person or business contact by name and company domain or LinkedIn URL.",
  inputSchema: z.object({
    firstName: z.string().optional().describe("Prospect first name, e.g. 'John'."),
    lastName: z.string().optional().describe("Prospect last name, e.g. 'Doe'."),
    fullName: z.string().optional().describe("Prospect full name, e.g. 'John Doe'."),
    domain: z.string().optional().describe("Company domain, e.g. 'stripe.com'."),
    linkedinUrl: z.string().optional().describe("Prospect LinkedIn profile URL."),
    verifyPhone: z
      .boolean()
      .optional()
      .default(true)
      .describe("If true, checks phone line status during lookup."),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    phoneNumber: z.string().optional(),
    phoneType: z.string().optional(),
    verified: z.boolean().optional(),
    advice: z.string().optional(),
    servedBy: z.string().optional(),
    costUsd: z.number().optional(),
    raw: z.unknown().optional(),
    error: z.string().optional(),
  }),
  async execute({ firstName, lastName, fullName, domain, linkedinUrl, verifyPhone }, ctx) {
    try {
      const customerId = ctx.session?.auth?.current?.principalId;

      const payload: Record<string, unknown> = {};
      if (firstName) payload.first_name = firstName;
      if (lastName) payload.last_name = lastName;
      if (fullName) payload.full_name = fullName;
      if (domain) payload.domain = domain;
      if (linkedinUrl) payload.linkedin_url = linkedinUrl;

      const extraHeaders: Record<string, string> = {};
      if (verifyPhone) {
        extraHeaders["X-Treg-Route-Verify"] = "true";
      }

      const result = await callGrowthTool({
        toolId: "treg.people.phone.find",
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

      let phoneNumber: string | undefined;
      let phoneType: string | undefined;
      let verified: boolean | undefined;

      if (result.data && typeof result.data === "object") {
        const body = result.data as Record<string, unknown>;
        const output = (body.output || body) as Record<string, unknown>;

        phoneNumber = (output.phone_number || output.phone || body.phone_number) as string | undefined;
        phoneType = (output.phone_type || output.type || body.phone_type) as string | undefined;
        verified = output.verified as boolean | undefined;

        const tregMeta = (body._treg as Record<string, unknown>) || {};
        const verification = tregMeta.verification as Record<string, unknown> | undefined;
        if (verification && verification.verdict) {
          verified = verification.verdict === "valid" || verification.verdict === "connected";
        }
      }

      return {
        success: true,
        phoneNumber,
        phoneType,
        verified,
        advice: result.advice,
        servedBy: result.servedBy,
        costUsd: result.costUsd,
        raw: result.data,
      };
    } catch (error) {
      if (ctx.abortSignal.aborted) throw error;
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to find phone number",
      };
    }
  },
});
