import type { TelegramLinkRecord } from "../../shared/types/telegram-link.js";
import { appOrigin, internalHeaders } from "./internal-api.js";

export async function fetchTelegramLinkForMember(telegramUserId: string): Promise<TelegramLinkRecord | undefined> {
  const response = await fetch(
    `${appOrigin()}/api/internal/telegram/link/member?telegramUserId=${encodeURIComponent(telegramUserId)}`,
    { headers: internalHeaders() },
  );

  if (!response.ok) {
    return undefined;
  }

  const body = await response.json() as { link: TelegramLinkRecord | null };
  return body.link ?? undefined;
}

export async function consumeTelegramLinkCodeRemote(input: {
  code: string;
  telegramUserId: string;
  telegramChatId: string;
  telegramUsername?: string;
  telegramDisplayName?: string;
}) {
  const response = await fetch(`${appOrigin()}/api/internal/telegram/link/consume`, {
    method: "POST",
    headers: internalHeaders(),
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    return { ok: false as const, reason: "invalid" as const };
  }

  return response.json() as Promise<
    | { ok: true; appUserId: string }
    | { ok: false; reason: "invalid" | "expired" }
  >;
}

/** Accepts "link ABC123" or "/link ABC123" as the whole message. */
export function parseTelegramLinkCommand(text: string) {
  const match = text.trim().match(/^\/?link\s+([A-Z0-9]{6})$/i);
  return match?.[1]?.toUpperCase();
}
