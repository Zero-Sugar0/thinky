import { Receiver } from "@upstash/qstash";
import { db, schema } from "@nuxthub/db";
import { eq } from "drizzle-orm";
import type { H3Event } from "h3";
import {
  analyzeUserContextForProactiveSuggestion,
  dispatchProactiveSuggestion,
  getRecentProactiveSuggestionsForUser,
} from "~~/server/utils/proactive";
import { fetchUserMemoryEntries } from "~~/server/utils/memory";
import { listThreadsForUser } from "~~/server/utils/threads";

async function verifyQStashOrSecret(event: H3Event): Promise<boolean> {
  const currentSigningKey = process.env.QSTASH_CURRENT_SIGNING_KEY;
  const nextSigningKey = process.env.QSTASH_NEXT_SIGNING_KEY;
  const internalSecret = process.env.INTERNAL_API_SECRET;
  const cronSecret = process.env.CRON_SECRET;

  const authHeader = getHeader(event, "authorization");
  if (authHeader) {
    const bearer = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (internalSecret && bearer === internalSecret) return true;
    if (cronSecret && bearer === cronSecret) return true;
  }

  // If QStash signing keys are configured, verify the signature
  const signature = getHeader(event, "upstash-signature");
  if (currentSigningKey && signature) {
    try {
      const receiver = new Receiver({
        currentSigningKey,
        nextSigningKey: nextSigningKey || currentSigningKey,
      });

      const body = await readRawBody(event, "utf-8");
      const url = getRequestURL(event).toString();

      return await receiver.verify({
        signature,
        body: body || "",
        url,
      });
    }
    catch {
      return false;
    }
  }

  // Allow in development without strict QStash key if internal secret matches or not configured
  if (import.meta.dev) {
    return true;
  }

  return false;
}

export default defineEventHandler(async (event) => {
  const authorized = await verifyQStashOrSecret(event);
  if (!authorized) {
    throw createError({
      statusCode: 401,
      statusMessage: "Unauthorized QStash or cron request",
    });
  }

  // Select all profiles where proactiveEnabled is not 'false'
  const profiles = await db.select({
    userId: schema.userProfiles.userId,
    timezone: schema.userProfiles.timezone,
    bio: schema.userProfiles.bio,
    proactiveEnabled: schema.userProfiles.proactiveEnabled,
    proactiveChannel: schema.userProfiles.proactiveChannel,
    userName: schema.user.name,
  })
    .from(schema.userProfiles)
    .innerJoin(schema.user, eq(schema.userProfiles.userId, schema.user.id));

  const results: Array<{ userId: string; dispatched: boolean; channel?: string; suggestion?: string }> = [];

  for (const userProfile of profiles) {
    if (userProfile.proactiveEnabled === "false") {
      continue;
    }

    const recentSuggestions = await getRecentProactiveSuggestionsForUser(userProfile.userId);
    const memories = await fetchUserMemoryEntries(userProfile.userId);

    // Retrieve recent threads to check for recent task or conversation titles
    const userThreads = await listThreadsForUser(userProfile.userId);
    const recentThreadTitles = userThreads.slice(0, 3).map(t => t.title).join("; ");

    const candidate = await analyzeUserContextForProactiveSuggestion({
      userId: userProfile.userId,
      userName: userProfile.userName,
      timezone: userProfile.timezone,
      bio: userProfile.bio,
      memories,
      recentChatSummary: recentThreadTitles ? `Recent active threads: ${recentThreadTitles}` : undefined,
      recentSuggestions,
    });

    if (candidate) {
      const channelPref = (userProfile.proactiveChannel === "slack" || userProfile.proactiveChannel === "all")
        ? userProfile.proactiveChannel
        : "chat";

      const dispatchResult = await dispatchProactiveSuggestion({
        userId: userProfile.userId,
        candidate,
        channelPref,
      });

      results.push({
        userId: userProfile.userId,
        dispatched: dispatchResult.success,
        channel: dispatchResult.dispatchedTo.join(", "),
        suggestion: candidate.content,
      });
    }
    else {
      results.push({
        userId: userProfile.userId,
        dispatched: false,
      });
    }
  }

  return {
    ok: true,
    processed: results.length,
    results,
  };
});
