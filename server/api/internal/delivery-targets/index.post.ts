import { deliveryTargetSchema } from "~~/server/schemas/delivery";
import { upsertDeliveryTarget } from "~~/server/utils/notifications";
import { requireInternalRequest } from "~~/server/utils/internal-api";

export default defineEventHandler(async (event) => {
  requireInternalRequest(event);
  const body = await readValidatedBody(event, deliveryTargetSchema.parse);
  await upsertDeliveryTarget(body.userId, body.channel, body.target);
  return { ok: true };
});
