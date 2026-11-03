import type { H3Event } from "h3";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "~~/auth";
import { getNodeRequest } from "~~/server/utils/h3-node";

export async function requireSessionUserId(event: unknown): Promise<string> {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(getNodeRequest(event as H3Event).headers),
  });

  if (!session?.user?.id) {
    throw createError({
      statusCode: 401,
      statusMessage: "Unauthorized",
    });
  }

  return session.user.id;
}
