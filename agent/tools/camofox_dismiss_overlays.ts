//agent/tools/camofox_dismiss_overlays.ts
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

const DismissResponseSchema = z.object({
  ok: z.literal(true),
  dismissed: z.array(z.object({ ref: z.string(), name: z.string() })),
  failed: z.array(z.object({ ref: z.string(), name: z.string(), reason: z.string() })),
});

export default defineTool({
  description:
    "Close pop-ups, modal dialogs, and banners that cover the page, such as newsletter sign-ups or 'Close' prompts. Only controls labelled as a close or dismiss action are clicked. Controls that accept terms, sign in, buy, submit, or continue are never clicked. Take a snapshot first so the pop-up refs are current, then call this, then take a fresh snapshot before the next click, because element refs can change after a pop-up closes. Use camofox_page_state to check whether a pop-up is blocking the page.",
  inputSchema: z.object({
    tabId: CamofoxTabIdSchema,
    maxClicks: z.number().int().min(1).max(5).default(3),
  }),
  outputSchema: DismissResponseSchema,
  async execute({ tabId, maxClicks }, ctx) {
    const userId = getCamofoxUserId(ctx.session.auth.current);
    let response: Response;
    try {
      response = await camofoxRequest(
        `/tabs/${encodeURIComponent(tabId)}/overlays/dismiss`,
        userId,
        ctx.abortSignal,
        "overlay dismiss",
        {
          method: "POST",
          body: camofoxPostBody(userId, { maxClicks }),
        },
      );
    } catch (error) {
      // The route answers 409 only while a person holds the tab. Other 409s
      // do not come from this route.
      if (error instanceof Error && error.message.includes("(HTTP 409)")) {
        throw new Error(
          "A person is controlling this browser tab right now. Stop acting on the page and tell the user.",
        );
      }
      throw error;
    }
    const value = await readCamofoxJson(response, "overlay dismiss");
    return parseCamofoxResponse(DismissResponseSchema, value, "overlay dismiss");
  },
});