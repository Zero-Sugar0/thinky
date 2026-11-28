import { z } from "zod";
import { consumeTelegramLinkCode } from "~~/server/utils/telegram-links";
import { requireInternalRequest } from "~~/server/utils/internal-api";

const bodySchema = z.object({
  code: z.string().min(1).max(32),
  telegramUserId: z.string().min(1).max(64),
  telegramChatId: z.string().min(1).max(64),
  telegramUsername: z.string().max(128).optional(),
  telegramDisplayName: z.string().max(256).optional(),
});

export default defineEventHandler(async (event) => {
  requireInternalRequest(event);
  const body = await readValidatedBody(event, bodySchema.parse);
  return consumeTelegramLinkCode(body);
});
