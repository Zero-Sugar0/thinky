import { defineTool } from "eve/tools";
import { z } from "zod";
import {
  CAMOFOX_LIVE_VIEWER_TTL_SECONDS,
  CamofoxTabIdSchema,
  createCamofoxLiveViewerUrl,
  getCamofoxUserId,
} from "../lib/camofox.js";

export default defineTool({
  description:
    "Issue a fresh signed live-viewer URL for one of the current user's open browser tabs. The URL is a bearer credential; share it only with the requesting user.",
  inputSchema: z.object({ tabId: CamofoxTabIdSchema }),
  outputSchema: z.object({
    url: z.string().url(),
    expiresInSeconds: z.number().int().positive(),
  }),
  async execute({ tabId }, ctx) {
    const userId = getCamofoxUserId(ctx.session.auth.current);
    return {
      url: await createCamofoxLiveViewerUrl(tabId, userId, ctx.abortSignal),
      expiresInSeconds: CAMOFOX_LIVE_VIEWER_TTL_SECONDS,
    };
  },
});
