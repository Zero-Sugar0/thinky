import { createTelegramLinkCode } from "~~/server/utils/telegram-links";
import { requireSessionUserId } from "~~/server/utils/session";

export default defineEventHandler(async (event) => {
  const appUserId = await requireSessionUserId(event);
  return createTelegramLinkCode(appUserId);
});
