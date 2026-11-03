//agent/tools/camofox_downloads.ts
import { defineTool } from "eve/tools";
import { z } from "zod";
import {
  CamofoxTabIdSchema,
  camofoxRequest,
  getCamofoxUserId,
  parseCamofoxResponse,
  readCamofoxJson,
} from "../lib/camofox.js";

const DownloadsResponseSchema = z.object({
  tabId: CamofoxTabIdSchema,
  downloads: z.array(z.unknown()).max(100),
});

export default defineTool({
  description:
    "List the current tab's downloads without fetching their contents. Use after a user-requested download to check its status; individual download fields are returned as provided by Camofox.",
  inputSchema: z.object({
    tabId: CamofoxTabIdSchema,
  }),
  outputSchema: DownloadsResponseSchema,
  async execute({ tabId }, ctx) {
    const userId = getCamofoxUserId(ctx.session.auth.current);
    const response = await camofoxRequest(
      `/tabs/${encodeURIComponent(tabId)}/downloads`,
      userId,
      ctx.abortSignal,
      "downloads",
      { method: "GET" },
    );
    const value = await readCamofoxJson(response, "downloads");
    return parseCamofoxResponse(DownloadsResponseSchema, value, "downloads");
  },
});
