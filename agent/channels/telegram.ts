import { telegramChannel, type TelegramContext, type TelegramInboundResult, type TelegramMessage } from "eve/channels/telegram";
import { buildAppSessionAuth } from "../../shared/app-auth.js";
import { saveDeliveryTarget } from "../lib/delivery-targets-internal.js";
import {
  consumeTelegramLinkCodeRemote,
  fetchTelegramLinkForMember,
  parseTelegramLinkCommand,
} from "../lib/telegram-internal.js";

const TITLE = "Telegram";

function appBaseUrl(): string {
  return process.env.BETTER_AUTH_URL ? process.env.BETTER_AUTH_URL.replace(/\/$/, "") : "Thinky";
}

/** Handles "link <code>" from a private chat. Returns true when the message was a link command. */
async function tryHandleLinkCommand(ctx: TelegramContext, message: TelegramMessage): Promise<boolean> {
  const text = message.text || message.caption;
  const code = parseTelegramLinkCommand(text);
  if (!code || !message.from) return false;

  if (ctx.telegram.chatType !== "private") {
    await ctx.telegram.sendMessage("To link your account, send the code to me in a private chat.");
    return true;
  }

  const result = await consumeTelegramLinkCodeRemote({
    code,
    telegramUserId: message.from.id,
    telegramChatId: ctx.telegram.chatId,
    telegramUsername: message.from.username,
    telegramDisplayName: [message.from.firstName, message.from.lastName].filter(Boolean).join(" ") || undefined,
  });

  if (result.ok) {
    await ctx.telegram.sendMessage("Your Telegram account is now linked to Thinky. Messages here will use your profile and integrations.");
    return true;
  }

  await ctx.telegram.sendMessage(
    result.reason === "expired"
      ? `That link code has expired. Generate a new one in ${appBaseUrl()}/settings/integrations.`
      : `That link code is invalid. Generate a fresh code in ${appBaseUrl()}/settings/integrations.`,
  );
  return true;
}

export default telegramChannel({
  botUsername: process.env.TELEGRAM_BOT_USERNAME,

  async onMessage(ctx, message): Promise<TelegramInboundResult> {
    if (await tryHandleLinkCommand(ctx, message)) {
      return null;
    }

    const telegramUserId = message.from ? message.from.id : undefined;
    const link = telegramUserId ? await fetchTelegramLinkForMember(telegramUserId) : undefined;

    if (!link) {
      return {
        auth: null,
        title: TITLE,
        context: [
          "This Telegram account is not linked to a Thinky profile, so you have no access to the caller's memory or integrations.",
          `If they ask for anything that needs those, tell them to open ${appBaseUrl()}/settings/integrations, generate a link code, and send \`link <code>\` to you in a private chat.`,
        ],
      };
    }

    // Remember private chats so proactive messages can reach the user here later.
    if (ctx.telegram.chatType === "private") {
      await saveDeliveryTarget(link.appUserId, "telegram", ctx.telegram.chatId).catch(() => undefined);
    }

    return {
      auth: buildAppSessionAuth(link.appUserId, {
        name: link.telegramDisplayName ?? message.from?.firstName,
        telegram_user_id: link.telegramUserId,
        telegram_username: link.telegramUsername,
        linked: "true",
      }),
      title: TITLE,
    };
  },
});
