import { defineTool } from "eve/tools";
import { z } from "zod";
import {
  CamofoxActionSchema,
  CamofoxTabIdSchema,
  camofoxPostBody,
  camofoxRequest,
  getCamofoxUserId,
  parseCamofoxResponse,
  readCamofoxJson,
  validateCamofoxTargetUrl,
} from "../lib/camofox.js";

const NavigateSchema = z
  .object({
    tabId: CamofoxTabIdSchema,
    url: z.string().url().optional(),
    macro: z.string().regex(/^@[a-z][a-z0-9_]{0,63}$/).optional(),
    query: z.string().trim().min(1).max(500).optional(),
  })
  .refine((value) => {
    const usingUrl = value.url !== undefined;
    const usingMacro = value.macro !== undefined && value.query !== undefined;
    return usingUrl !== usingMacro;
  });

export default defineTool({
  description:
    "Navigate one of the current user's browser tabs to a public HTTPS URL or search macro. Do not use this to bypass site access controls or protections.",
  inputSchema: NavigateSchema,
  outputSchema: CamofoxActionSchema,
  async execute({ tabId, url, macro, query }, ctx) {
    const userId = getCamofoxUserId(ctx.session.auth.current);
    const targetUrl = url ? validateCamofoxTargetUrl(url) : undefined;
    const response = await camofoxRequest(
      `/tabs/${encodeURIComponent(tabId)}/navigate`,
      userId,
      ctx.abortSignal,
      "navigate",
      {
        method: "POST",
        body: camofoxPostBody(userId, { url: targetUrl, macro, query }),
      },
    );
    const value = await readCamofoxJson(response, "navigate");
    const result =
      value === undefined
        ? { ok: true }
        : parseCamofoxResponse(CamofoxActionSchema, value, "navigate");
    if (result.ok === false) {
      throw new Error("Camofox did not complete navigation.");
    }
    return { ok: true, ...(result.url ? { url: result.url } : {}) };
  },
});
