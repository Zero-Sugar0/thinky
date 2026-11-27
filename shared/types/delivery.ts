export const DELIVERY_CHANNELS = ["chat", "slack", "imessage", "telegram"] as const;
export type DeliveryChannel = (typeof DELIVERY_CHANNELS)[number];

/** Expands a user's preference ("all" or one channel) into concrete channels. */
export function expandChannelPreference(preference: string): DeliveryChannel[] {
  if (preference === "all") return [...DELIVERY_CHANNELS];
  return (DELIVERY_CHANNELS as readonly string[]).includes(preference)
    ? [preference as DeliveryChannel]
    : ["chat"];
}
