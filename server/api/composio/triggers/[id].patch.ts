import { getComposioClient, isComposioConfigured } from "~~/server/utils/composio";
import { requireSessionUserId } from "~~/server/utils/session";

export default defineEventHandler(async (event) => {
  await requireSessionUserId(event);
  if (!isComposioConfigured()) throw createError({ statusCode: 503, statusMessage: "Composio is not configured" });
  const composio = getComposioClient();
  if (!composio) throw createError({ statusCode: 503, statusMessage: "Composio is not configured" });
  const id = getRouterParam(event, "id");
  const body = await readBody<{ enabled?: boolean }>(event);
  if (!id || typeof body?.enabled !== "boolean") throw createError({ statusCode: 400, statusMessage: "Trigger id and enabled are required" });
  if (body.enabled) await composio.triggers.enable(id);
  else await composio.triggers.disable(id);
  return { ok: true, enabled: body.enabled };
});
