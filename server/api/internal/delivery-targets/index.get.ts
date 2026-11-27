import { deliveryTargetQuerySchema } from "~~/server/schemas/delivery";
import { listDeliveryTargets } from "~~/server/utils/notifications";
import { requireInternalRequest } from "~~/server/utils/internal-api";

export default defineEventHandler(async (event) => {
  requireInternalRequest(event);
  const query = await getValidatedQuery(event, deliveryTargetQuerySchema.parse);
  return { targets: await listDeliveryTargets(query.userId) };
});
