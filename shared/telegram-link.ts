/**
 * Pure helpers for linking a Telegram account to Thinky. Shared by the Telegram
 * channel, the server, and the settings UI so they agree on the code format.
 */

// Link codes are 6 uppercase hex characters (see server/utils/telegram-links.ts).
const CODE = "([0-9A-F]{6})";

/**
 * Accepts the ways a person can send a link code to the bot:
 * - `link 7C160C` (what the settings page shows)
 * - `/start link_7C160C` (what Telegram sends when a deep link is opened)
 * - `7C160C` (the bare code)
 * Returns the code in uppercase, or undefined when the text is not a link attempt.
 */
export function parseTelegramLinkCommand(text: string | undefined): string | undefined {
  const value = (text ?? "").trim();
  const patterns = [
    new RegExp(`^/?link\\s+${CODE}$`, "i"),
    new RegExp(`^/start\\s+(?:link[_-])?${CODE}$`, "i"),
    new RegExp(`^${CODE}$`, "i"),
  ];

  for (const pattern of patterns) {
    const match = value.match(pattern);
    if (match?.[1]) {
      return match[1].toUpperCase();
    }
  }
  return undefined;
}

/** True for a bare /start, with or without a bot mention, and no deep-link payload. */
export function isBareStartCommand(text: string | undefined): boolean {
  return /^\/start(?:@\w+)?$/i.test((text ?? "").trim());
}

/** Deep link that opens the bot and sends the code as the /start payload in one tap. */
export function telegramStartLink(botUsername: string, code: string): string {
  return `https://t.me/${botUsername.replace(/^@/, "")}?start=link_${code}`;
}
