import { defineTool } from "eve/tools";
import { z } from "zod";
import { requireUserId } from "../lib/principal.js";
import { updateProfileSettings } from "../lib/profile-internal.js";

const CHANNELS = ["chat", "slack", "telegram", "all"] as const;

function isValidTimezone(zone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

export default defineTool({
  description:
    "Change the owner's proactive check-in settings: turn check-ins on or off, set how often routine check-ins happen (2h, 4h, 8h, or daily), choose the channel, or set the timezone that quiet hours use. Only call this after the owner has said yes to the exact change. iMessage is not offered here because check-ins cannot be delivered to it yet.",
  inputSchema: z.object({
    enabled: z.boolean().optional().describe("Turn routine check-ins on or off."),
    frequency: z.enum(["2h", "4h", "8h", "daily"]).optional().describe("How often routine check-ins can happen."),
    channel: z.enum(CHANNELS).optional().describe("Where check-ins are sent: chat, slack, telegram, or all."),
    timezone: z.string().trim().min(1).max(64).optional().describe("IANA timezone, for example Africa/Accra. Quiet hours follow it."),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    error: z.string().optional(),
  }),
  async execute({ enabled, frequency, channel, timezone }, ctx) {
    const userId = requireUserId(ctx.session.auth.current?.principalId);

    if (timezone !== undefined && !isValidTimezone(timezone)) {
      return { success: false, error: `"${timezone}" is not a valid timezone. Use an IANA name such as Africa/Accra.` };
    }

    if (enabled === undefined && frequency === undefined && channel === undefined && timezone === undefined) {
      return { success: false, error: "Nothing to change." };
    }

    try {
      await updateProfileSettings(userId, {
        proactiveEnabled: enabled,
        proactiveFrequency: frequency,
        proactiveChannel: channel,
        timezone,
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Could not update the settings." };
    }
  },
});
