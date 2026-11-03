//agent/tools/camofox_click.ts
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
} from "../lib/camofox.js";

const ClickSchema = z
  .object({
    tabId: CamofoxTabIdSchema,
    ref: z.string().regex(/^e\d{1,8}$/).optional(),
    selector: z.string().trim().min(1).max(2048).optional(),
  })
  .refine((value) => Boolean(value.ref) !== Boolean(value.selector));

export default defineTool({
  description:
    "Click one element in the current user's browser tab. Use a snapshot ref when possible. Before clicking a control that sends, purchases, books, deletes, or changes an account, get explicit user confirmation for that exact action.",
  inputSchema: ClickSchema,
  outputSchema: CamofoxActionSchema,
  async execute({ tabId, ref, selector }, ctx) {
    const userId = getCamofoxUserId(ctx.session.auth.current);
    const response = await camofoxRequest(
      `/tabs/${encodeURIComponent(tabId)}/click`,
      userId,
      ctx.abortSignal,
      "click",
      {
        method: "POST",
        body: camofoxPostBody(userId, { ref, selector }),
      },
    );
    const value = await readCamofoxJson(response, "click");
    const result =
      value === undefined
        ? { ok: true }
        : parseCamofoxResponse(CamofoxActionSchema, value, "click");
    if (result.ok === false) {
      throw new Error("Camofox did not complete the click.");
    }
    return { ok: true, ...(result.url ? { url: result.url } : {}) };
  },
});
