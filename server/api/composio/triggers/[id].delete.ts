import { getComposioClient, isComposioConfigured } from "~~/server/utils/composio";
import { requireSessionUserId } from "~~/server/utils/session";

export default defineEventHandler(async (event) => {
  await requireSessionUserId(event);
  if (!isComposioConfigured()) throw createError({ statusCode: 503, statusMessage: "Composio is not configured" });
  const composio = getComposioClient();
  if (!composio) throw createError({ statusCode: 503, statusMessage: "Composio is not configured" });
  const id = getRouterParam(event, "id");
  if (!id) throw createError({ statusCode: 400, statusMessage: "Trigger id is required" });
  await composio.triggers.delete(id);
  return { ok: true };
});
