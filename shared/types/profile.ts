export const PROACTIVE_CHANNELS = ["chat", "slack", "imessage", "telegram", "all"] as const;
export type ProactiveChannel = (typeof PROACTIVE_CHANNELS)[number];

export interface UserProfile {
  userId: string;
  timezone: string;
  locale: string;
  bio: string;
  proactiveEnabled: boolean;
  proactiveChannel: ProactiveChannel;
  updatedAt: number;
}

export interface UserProfilePatch {
  name?: string;
  timezone?: string;
  locale?: string;
  bio?: string;
  proactiveEnabled?: boolean;
  proactiveChannel?: ProactiveChannel;
  phoneNumber?: string | null;
}

export interface UserProfileWithUser extends UserProfile {
  name: string;
  email: string;
  phoneNumber?: string;
}
