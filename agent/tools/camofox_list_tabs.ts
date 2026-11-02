import { defineTool } from "eve/tools";
import { z } from "zod";
import {
  CamofoxTabSchema,
  camofoxRequest,
  getCamofoxUserId,
  parseCamofoxResponse,
  readCamofoxJson,
} from "../lib/camofox.js";

const ListTabsSchema = z.object({
  tabs: z.array(CamofoxTabSchema).max(1000),
});

export default defineTool({
  description: "List open tabs in the current user's private browser space.",
  inputSchema: z.object({}),
  outputSchema: ListTabsSchema,
  async execute(_input, ctx) {
    const userId = getCamofoxUserId(ctx.session.auth.current);
    const response = await camofoxRequest(
      "/tabs",
      userId,
      ctx.abortSignal,
      "list tabs",
    );
    return parseCamofoxResponse(
      ListTabsSchema,
      await readCamofoxJson(response, "list tabs"),
      "list tabs",
    );
  },
});
