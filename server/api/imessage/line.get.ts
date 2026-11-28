import { getPhoneLinkForAppUser } from "~~/server/utils/phone-links";
import { requireSessionUserId } from "~~/server/utils/session";

/**
 * The agent's single iMessage number and the signed-in user's linked phone. The number is
 * public (it is the number people text), so it is returned as is; no Photon key is involved.
 */
export default defineEventHandler(async (event) => {
  const appUserId = await requireSessionUserId(event);
  const link = await getPhoneLinkForAppUser(appUserId);

  return {
    agentNumber: process.env.PHOTON_AGENT_NUMBER?.trim() || null,
    phoneNumber: link?.phoneNumber ?? null,
  };
});
