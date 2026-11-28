import { deleteTelegramLinkForAppUser } from "~~/server/utils/telegram-links";
import { requireSessionUserId } from "~~/server/utils/session";

export default defineEventHandler(async (event) => {
  const appUserId = await requireSessionUserId(event);
  const removed = await deleteTelegramLinkForAppUser(appUserId);
  return { removed };
});
