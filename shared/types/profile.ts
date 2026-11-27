export const PROACTIVE_CHANNELS = ["chat", "slack", "imessage", "telegram", "all"] as const;
export type ProactiveChannel = (typeof PROACTIVE_CHANNELS)[number];

/** How often a user is willing to receive routine check-ins. Urgent items are not limited by this. */
export const PROACTIVE_FREQUENCIES = ["2h", "4h", "8h", "daily"] as const;
export type ProactiveFrequency = (typeof PROACTIVE_FREQUENCIES)[number];

export const FREQUENCY_HOURS: Record<ProactiveFrequency, number> = {
  "2h": 2,
  "4h": 4,
  "8h": 8,
  "daily": 24,
};

export interface UserProfile {
  userId: string;
  timezone: string;
  locale: string;
  bio: string;
  proactiveEnabled: boolean;
  proactiveChannel: ProactiveChannel;
  proactiveFrequency: ProactiveFrequency;
  updatedAt: number;
}

export interface UserProfilePatch {
  name?: string;
  timezone?: string;
  locale?: string;
  bio?: string;
  proactiveEnabled?: boolean;
  proactiveChannel?: ProactiveChannel;
  proactiveFrequency?: ProactiveFrequency;
  phoneNumber?: string | null;
}

export interface UserProfileWithUser extends UserProfile {
  name: string;
  email: string;
  phoneNumber?: string;
}
