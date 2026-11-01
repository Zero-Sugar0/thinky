export type ProactiveChannel = "chat" | "slack" | "all";

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
