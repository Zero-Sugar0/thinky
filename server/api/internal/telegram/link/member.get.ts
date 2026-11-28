import { z } from "zod";
import { getTelegramLinkForMember } from "~~/server/utils/telegram-links";
import { requireInternalRequest } from "~~/server/utils/internal-api";

const querySchema = z.object({ telegramUserId: z.string().min(1).max(64) });

export default defineEventHandler(async (event) => {
  requireInternalRequest(event);
  const { telegramUserId } = await getValidatedQuery(event, querySchema.parse);
  const link = await getTelegramLinkForMember(telegramUserId);
  return { link: link ?? null };
});
