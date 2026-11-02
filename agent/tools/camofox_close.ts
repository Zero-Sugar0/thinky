import { defineTool } from "eve/tools";
import { z } from "zod";
import {
  CamofoxTabIdSchema,
  camofoxRequest,
  getCamofoxUserId,
} from "../lib/camofox.js";

export default defineTool({
  description: "Close a tab in the current user's private browser space.",
  inputSchema: z.object({ tabId: CamofoxTabIdSchema }),
  outputSchema: z.object({ ok: z.boolean() }),
  async execute({ tabId }, ctx) {
    const userId = getCamofoxUserId(ctx.session.auth.current);
    await camofoxRequest(
      `/tabs/${encodeURIComponent(tabId)}`,
      userId,
      ctx.abortSignal,
      "close tab",
      { method: "DELETE" },
    );
    return { ok: true };
  },
});
