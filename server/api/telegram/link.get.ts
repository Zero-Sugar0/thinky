import { getPendingTelegramLinkCode, getTelegramLinkForAppUser, toTelegramLinkSummary } from "~~/server/utils/telegram-links";
import { requireSessionUserId } from "~~/server/utils/session";

export default defineEventHandler(async (event) => {
  const appUserId = await requireSessionUserId(event);
  const link = await getTelegramLinkForAppUser(appUserId);
  const pending = await getPendingTelegramLinkCode(appUserId);
  return toTelegramLinkSummary(link, pending);
});
