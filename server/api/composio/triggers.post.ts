import { z } from "zod";
import { getComposioClient, isComposioConfigured } from "~~/server/utils/composio";
import { requireSessionUserId } from "~~/server/utils/session";

const bodySchema = z.object({
  slug: z.string().min(1).max(180),
  connectedAccountId: z.string().min(1).optional(),
  triggerConfig: z.record(z.string(), z.unknown()).default({}),
});

export default defineEventHandler(async (event) => {
  const userId = await requireSessionUserId(event);
  if (!isComposioConfigured()) throw createError({ statusCode: 503, statusMessage: "Composio is not configured" });
  const composio = getComposioClient();
  if (!composio) throw createError({ statusCode: 503, statusMessage: "Composio is not configured" });

  const input = bodySchema.parse(await readBody(event));
  const result = await composio.triggers.create(userId, input.slug, {
    connectedAccountId: input.connectedAccountId,
    triggerConfig: input.triggerConfig,
  });
  return { triggerId: result.triggerId };
});
