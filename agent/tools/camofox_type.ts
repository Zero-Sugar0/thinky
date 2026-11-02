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

const TypeSchema = z
  .object({
    tabId: CamofoxTabIdSchema,
    text: z.string().max(10_000),
    ref: z.string().regex(/^e\d{1,8}$/).optional(),
    selector: z.string().trim().min(1).max(2048).optional(),
    pressEnter: z.boolean().optional(),
  })
  .refine((value) => Boolean(value.ref) !== Boolean(value.selector));

const TypeResponseSchema = z.object({ ok: z.boolean().optional() });

export default defineTool({
  description:
    "Type text into an input in the current user's browser tab. Before typing into or submitting a consequential form—such as a purchase, booking, message, or account change—get explicit user confirmation.",
  inputSchema: TypeSchema,
  outputSchema: z.object({ ok: z.boolean() }),
  async execute({ tabId, text, ref, selector, pressEnter }, ctx) {
    const userId = getCamofoxUserId(ctx.session.auth.current);
    const response = await camofoxRequest(
      `/tabs/${encodeURIComponent(tabId)}/type`,
      userId,
      ctx.abortSignal,
      "type text",
      {
        method: "POST",
        body: camofoxPostBody(userId, { text, ref, selector, pressEnter }),
      },
    );
    const value = await readCamofoxJson(response, "type text");
    if (value !== undefined) {
      const result = parseCamofoxResponse(TypeResponseSchema, value, "type text");
      if (result.ok === false) {
        throw new Error("Camofox did not complete the typing action.");
      }
    }
    return { ok: true };
  },
});
