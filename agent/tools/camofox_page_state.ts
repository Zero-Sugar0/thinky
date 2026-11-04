//agent/tools/camofox_page_state.ts
import { defineTool } from "eve/tools";
import { z } from "zod";
import {
  CamofoxTabIdSchema,
  camofoxRequest,
  getCamofoxUserId,
  parseCamofoxResponse,
  readCamofoxJson,
} from "../lib/camofox.js";

const PAGE_STATE_KINDS = [
  "captcha",
  "block",
  "two_factor",
  "login_wall",
  "consent",
  "no_results",
  "ok",
] as const;

const PageStateResponseSchema = z.object({
  ok: z.literal(true),
  url: z.string(),
  title: z.string(),
  state: z.object({
    kind: z.enum(PAGE_STATE_KINDS),
    reasons: z.array(z.string()),
  }),
  overlayRefs: z.array(z.string()),
  refsCount: z.number().int().nonnegative(),
});

export default defineTool({
  description:
    "Describe the current page without changing it. Returns the page URL and title, whether the page is a captcha, a block page, a sign-in wall, a verification-code prompt, a cookie banner, an empty result set, or an ordinary page, and the refs of pop-ups that can be closed. Call this when a click or navigation did not show what you expected, before deciding what to do next. Refs for pop-ups come from the most recent snapshot, so take a snapshot first if the page has changed.",
  inputSchema: z.object({
    tabId: CamofoxTabIdSchema,
  }),
  outputSchema: PageStateResponseSchema,
  async execute({ tabId }, ctx) {
    const userId = getCamofoxUserId(ctx.session.auth.current);
    const params = new URLSearchParams({ userId });
    const response = await camofoxRequest(
      `/tabs/${encodeURIComponent(tabId)}/state?${params}`,
      userId,
      ctx.abortSignal,
      "page state",
      { method: "GET" },
    );
    const value = await readCamofoxJson(response, "page state");
    return parseCamofoxResponse(PageStateResponseSchema, value, "page state");
  },
});