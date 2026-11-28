import { defineTool } from "eve/tools";
import { z } from "zod";
import { requireUserId } from "../lib/principal.js";
import { fetchUserProfile } from "../lib/profile-internal.js";

export default defineTool({
  description:
    "Read the owner's proactive check-in settings: whether check-ins are on, how often, which channel, and their timezone. Use it before changing anything, so you can tell the owner the current state.",
  inputSchema: z.object({}),
  outputSchema: z.object({
    found: z.boolean(),
    enabled: z.boolean().optional(),
    frequency: z.string().optional(),
    channel: z.string().optional(),
    timezone: z.string().optional(),
  }),
  async execute(_input, ctx) {
    const userId = requireUserId(ctx.session.auth.current?.principalId);
    const profile = await fetchUserProfile(userId);
    if (!profile) return { found: false };

    return {
      found: true,
      enabled: Boolean(profile.proactiveEnabled),
      frequency: profile.proactiveFrequency,
      channel: profile.proactiveChannel,
      timezone: profile.timezone,
    };
  },
});
