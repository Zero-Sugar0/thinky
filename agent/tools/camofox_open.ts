import { defineTool } from "eve/tools";
import { z } from "zod";
import {
  CamofoxTabSchema,
  camofoxPostBody,
  camofoxRequest,
  getCamofoxUserId,
  parseCamofoxResponse,
  readCamofoxJson,
  validateCamofoxTargetUrl,
} from "../lib/camofox.js";

export default defineTool({
  description:
    "Open a page in the current user's private browser space. Browse public HTTPS sites only; respect site access controls. Never submit a purchase, booking, message, or other consequential form without the user's explicit confirmation.",
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
  outputSchema: CamofoxTabSchema,
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
    return parseCamofoxResponse(
      CamofoxTabSchema,
      await readCamofoxJson(response, "open tab"),
      "open tab",
    );
  },
});
