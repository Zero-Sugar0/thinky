//agent/tools/camofox_navigate.ts
import { defineTool } from "eve/tools";
import { z } from "zod";
import {
  CamofoxActionSchema,
  CamofoxTabIdSchema,
  camofoxPostBody,
  camofoxRequest,
  getCamofoxUserId,
  parseCamofoxResponse,
  readCamofoxJson,
  validateCamofoxTargetUrl,
} from "../lib/camofox.js";

const MACRO_NAMES = [
  "@google_search",
  "@youtube_search",
  "@amazon_search",
  "@reddit_search",
  "@reddit_subreddit",
  "@wikipedia_search",
  "@twitter_search",
  "@yelp_search",
  "@spotify_search",
  "@netflix_search",
  "@linkedin_search",
  "@instagram_search",
  "@tiktok_search",
  "@twitch_search",
] as const;

const NavigateSchema = z
  .object({
    tabId: CamofoxTabIdSchema,
    url: z.string().url().optional(),
    macro: z.enum(MACRO_NAMES).optional(),
    query: z.string().trim().min(1).max(500).optional(),
  })
  .refine((value) => {
    const usingUrl = value.url !== undefined;
    const usingMacro = value.macro !== undefined && value.query !== undefined;
    const macroAndQueryPaired = (value.macro === undefined) === (value.query === undefined);
    return usingUrl !== usingMacro && macroAndQueryPaired;
  });

export default defineTool({
  description:
    "Navigate one of the current user's browser tabs to a public HTTPS URL, or run a search macro with a query. Macros: @google_search, @youtube_search, @amazon_search, @reddit_search (JSON), @reddit_subreddit (pass the subreddit name as query, JSON), @wikipedia_search, @twitter_search, @yelp_search, @spotify_search, @netflix_search, @linkedin_search, @instagram_search, @tiktok_search, @twitch_search. Macros only load the search page; call camofox_snapshot afterwards to read results. Do not use this to bypass site access controls or protections.",
  inputSchema: NavigateSchema,
  outputSchema: CamofoxActionSchema,
  async execute({ tabId, url, macro, query }, ctx) {
    const userId = getCamofoxUserId(ctx.session.auth.current);
    const targetUrl = url ? validateCamofoxTargetUrl(url) : undefined;
    const response = await camofoxRequest(
      `/tabs/${encodeURIComponent(tabId)}/navigate`,
      userId,
      ctx.abortSignal,
      "navigate",
      {
        method: "POST",
        body: camofoxPostBody(userId, { url: targetUrl, macro, query }),
      },
    );
    const value = await readCamofoxJson(response, "navigate");
    const result =
      value === undefined
        ? { ok: true }
        : parseCamofoxResponse(CamofoxActionSchema, value, "navigate");
    if (result.ok === false) {
      throw new Error("Camofox did not complete navigation.");
    }
    return { ok: true, ...(result.url ? { url: result.url } : {}) };
  },
});
