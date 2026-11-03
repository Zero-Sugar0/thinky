//agent/tools/camofox_history.ts
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

const HistoryResponseSchema = z.object({
  ok: z.literal(true),
  url: z.string().min(1).max(4096).optional(),
});

export default defineTool({
  description:
    "Move the current user's browser tab back, forward, or reload it. Use 'back' to return to the previous page. Get a fresh snapshot afterwards, since element refs reset on each navigation.",
  inputSchema: z.object({
    tabId: CamofoxTabIdSchema,
    action: z.enum(["back", "forward", "refresh"]),
  }),
  outputSchema: HistoryResponseSchema,
  async execute({ tabId, action }, ctx) {
    const userId = getCamofoxUserId(ctx.session.auth.current);
    const response = await camofoxRequest(
      `/tabs/${encodeURIComponent(tabId)}/${action}`,
      userId,
      ctx.abortSignal,
      action,
      {
        method: "POST",
        body: camofoxPostBody(userId, {}),
      },
    );
    const value = await readCamofoxJson(response, action);
    const result = parseCamofoxResponse(HistoryResponseSchema, value, action);
    return { ok: true, ...(result.url ? { url: result.url } : {}) };
  },
});
