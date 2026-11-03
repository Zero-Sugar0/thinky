//agent/tools/camofox_wait.ts
import { defineTool } from "eve/tools";
import { z } from "zod";
import {
  CamofoxTabIdSchema,
  camofoxPostBody,
  camofoxRequest,
  getCamofoxUserId,
  parseCamofoxResponse,
  readCamofoxJson,
} from "../lib/camofox.js";

const WaitResponseSchema = z.object({
  ok: z.boolean(),
  ready: z.boolean(),
  error: z.string().optional(),
});

export default defineTool({
  description:
    "Wait for the current page to finish loading before reading it. Use after a click or navigation that loads new content, then call camofox_snapshot. Only set dismissConsent to true when the user explicitly asks to dismiss the site's consent banner.",
  inputSchema: z.object({
    tabId: CamofoxTabIdSchema,
    timeout: z.number().int().min(500).max(15000).default(10000),
    waitForNetwork: z.boolean().default(true),
    dismissConsent: z.boolean().default(false),
  }),
  outputSchema: z.object({ ok: z.literal(true), ready: z.boolean() }),
  async execute({ tabId, timeout, waitForNetwork, dismissConsent }, ctx) {
    const userId = getCamofoxUserId(ctx.session.auth.current);
    const response = await camofoxRequest(
      `/tabs/${encodeURIComponent(tabId)}/wait`,
      userId,
      ctx.abortSignal,
      "wait",
      {
        method: "POST",
        body: camofoxPostBody(userId, { timeout, waitForNetwork, dismissConsent }),
      },
    );
    const value = await readCamofoxJson(response, "wait");
    const result = parseCamofoxResponse(WaitResponseSchema, value, "wait");
    if (!result.ok) {
      throw new Error(result.error || "Camofox could not wait for the page.");
    }
    return { ok: true, ready: result.ready };
  },
});
