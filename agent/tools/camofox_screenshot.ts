import { defineTool } from "eve/tools";
import { z } from "zod";
import {
  CamofoxTabIdSchema,
  camofoxRequest,
  getCamofoxUserId,
  readCamofoxScreenshot,
} from "../lib/camofox.js";

const ScreenshotSchema = z.object({
  ok: z.boolean(),
  mimeType: z.string(),
  bytes: z.number().int().positive(),
});

export default defineTool({
  description:
    "Capture a visual screenshot of one of the current user's browser tabs. Prefer camofox_snapshot for page understanding.",
  inputSchema: z.object({ tabId: CamofoxTabIdSchema }),
  outputSchema: ScreenshotSchema,
  async execute({ tabId }, ctx) {
    const userId = getCamofoxUserId(ctx.session.auth.current);
    const response = await camofoxRequest(
      `/tabs/${encodeURIComponent(tabId)}/screenshot`,
      userId,
      ctx.abortSignal,
      "capture screenshot",
    );
    return {
      ok: true,
      ...(await readCamofoxScreenshot(response)),
    };
  },
});
