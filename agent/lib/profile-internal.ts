import type { UserProfileWithUser } from "../../shared/types/profile.js";
import { appOrigin, internalHeaders } from "./internal-api.js";

export async function fetchUserProfile(userId: string): Promise<UserProfileWithUser | undefined> {
  try {
    const response = await fetch(
      `${appOrigin()}/api/internal/profile?userId=${encodeURIComponent(userId)}`,
      { headers: internalHeaders() },
    );

    if (!response.ok) {
      return undefined;
    }

    const { profile } = await response.json() as { profile: UserProfileWithUser | null };
    return profile ?? undefined;
  }
  catch {
    return undefined;
  }
}

export interface ProactiveSettings {
  enabled: boolean;
  frequency: "2h" | "4h" | "8h" | "daily";
  channel: "chat" | "slack" | "imessage" | "telegram" | "all";
  timezone: string;
}

export async function updateProfileSettings(
  userId: string,
  patch: {
    proactiveEnabled?: boolean;
    proactiveFrequency?: ProactiveSettings["frequency"];
    proactiveChannel?: ProactiveSettings["channel"];
    timezone?: string;
  },
): Promise<void> {
  const response = await fetch(`${appOrigin()}/api/internal/profile`, {
    method: "PATCH",
    headers: internalHeaders(),
    body: JSON.stringify({ userId, ...patch }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { statusMessage?: string; message?: string };
    throw new Error(body.statusMessage ?? body.message ?? `Profile update failed (${response.status})`);
  }
}
