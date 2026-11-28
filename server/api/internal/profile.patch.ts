import { z } from "zod";
import { patchProfileBodySchema } from "~~/server/schemas/profile";
import { updateProfileForUser } from "~~/server/utils/profile";
import { requireInternalRequest } from "~~/server/utils/internal-api";

// The agent may change only the proactive settings and timezone. Name, bio, and phone stay user-controlled.
const bodySchema = z.object({
  userId: z.string().trim().min(1),
  ...patchProfileBodySchema.pick({
    timezone: true,
    proactiveEnabled: true,
    proactiveChannel: true,
    proactiveFrequency: true,
  }).shape,
});

export default defineEventHandler(async (event) => {
  requireInternalRequest(event);

  const { userId, ...patch } = await readValidatedBody(event, bodySchema.parse);
  const profile = await updateProfileForUser(userId, patch);

  if (!profile) {
    throw createError({ statusCode: 404, statusMessage: "User not found" });
  }

  return { profile };
});
