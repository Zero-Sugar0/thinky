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

const ScrollResponseSchema = z.object({ ok: z.boolean().optional() });

export default defineTool({
  description: "Scroll the current user's browser tab.",
  inputSchema: z.object({
    tabId: CamofoxTabIdSchema,
    direction: z.enum(["up", "down", "left", "right"]),
    amount: z.number().int().min(1).max(5000).default(600),
  }),
  outputSchema: z.object({ ok: z.boolean() }),
  async execute({ tabId, direction, amount }, ctx) {
    const userId = getCamofoxUserId(ctx.session.auth.current);
    const response = await camofoxRequest(
      `/tabs/${encodeURIComponent(tabId)}/scroll`,
      userId,
      ctx.abortSignal,
      "scroll",
      {
        method: "POST",
        body: camofoxPostBody(userId, { direction, amount }),
      },
    );
    const value = await readCamofoxJson(response, "scroll");
    if (value !== undefined) {
      const result = parseCamofoxResponse(ScrollResponseSchema, value, "scroll");
      if (result.ok === false) {
        throw new Error("Camofox did not complete the scroll.");
      }
    }
    return { ok: true };
  },
});
