import { defineTool } from "eve/tools";
import { z } from "zod";
import {
  CamofoxTabSchema,
  CAMOFOX_LIVE_VIEWER_TTL_SECONDS,
  camofoxPostBody,
  camofoxRequest,
  createCamofoxLiveViewerUrl,
  getCamofoxUserId,
  parseCamofoxResponse,
  readCamofoxJson,
  validateCamofoxTargetUrl,
} from "../lib/camofox.js";

const OpenTabOutputSchema = CamofoxTabSchema.extend({
  liveViewerUrl: z.string().url().optional(),
  liveViewerExpiresInSeconds: z.number().int().positive().optional(),
  liveViewerError: z.string().optional(),
});

export default defineTool({
  description:
    "Open a page in the current user's private browser space and issue a signed, expiring live-viewer URL for that tab. The URL is a bearer credential: share it only with the requesting user. Browse public HTTPS sites only; respect site access controls. Never submit a purchase, booking, message, or other consequential form without the user's explicit confirmation.",
  inputSchema: z.object({
    url: z.string().url().describe("Public HTTPS URL to open"),
    sessionKey: z
      .string()
      .trim()
      .min(1)
      .max(128)
      .regex(/^[a-zA-Z0-9._:-]+$/)
      .default("main")
      .describe("Group related tabs under the same user's browser space"),
  }),
  outputSchema: OpenTabOutputSchema,
  async execute({ url, sessionKey }, ctx) {
    const userId = getCamofoxUserId(ctx.session.auth.current);
    const targetUrl = validateCamofoxTargetUrl(url);
    const response = await camofoxRequest(
      "/tabs",
      userId,
      ctx.abortSignal,
      "open tab",
      {
        method: "POST",
        body: camofoxPostBody(userId, { sessionKey, url: targetUrl }),
      },
    );
    const tab = parseCamofoxResponse(
      CamofoxTabSchema,
      await readCamofoxJson(response, "open tab"),
      "open tab",
    );
    try {
      return {
        ...tab,
        liveViewerUrl: await createCamofoxLiveViewerUrl(tab.tabId, userId, ctx.abortSignal),
        liveViewerExpiresInSeconds: CAMOFOX_LIVE_VIEWER_TTL_SECONDS,
      };
    } catch (error) {
      return {
        ...tab,
        liveViewerError:
          error instanceof Error ? error.message : "The live viewer link could not be issued.",
      };
    }
  },
});
