import { and, desc, eq, gt } from "drizzle-orm";
import { db, schema } from "@nuxthub/db";
import type { ProactiveChannel } from "#shared/types/profile";
import { expandChannelPreference } from "#shared/types/delivery";
import { enqueueNotification } from "~~/server/utils/notifications";
import type { CheckinCategory } from "~~/server/utils/checkin-policy";

export interface ProactiveSuggestionCandidate {
  type: CheckinCategory | "reminder";
  content: string;
}

export async function getLastProactiveSuggestionForUser(userId: string) {
  const [row] = await db.select()
    .from(schema.proactiveSuggestions)
    .where(eq(schema.proactiveSuggestions.userId, userId))
    .orderBy(desc(schema.proactiveSuggestions.createdAt))
    .limit(1);

  return row ?? null;
}

/** Records a suggestion shown in a chat thread. */
export async function recordProactiveSuggestion(input: {
  userId: string;
  threadId?: string | null;
  channel: ProactiveChannel | string;
  content: string;
  type: string;
}) {
  const id = crypto.randomUUID();
  await db.insert(schema.proactiveSuggestions).values({
    id,
    userId: input.userId,
    threadId: input.threadId ?? null,
    channel: input.channel,
    content: input.content,
    type: input.type,
  });

  return id;
}

export async function getRecentProactiveSuggestionsForThread(threadId: string) {
  return db.select()
    .from(schema.proactiveSuggestions)
    .where(eq(schema.proactiveSuggestions.threadId, threadId))
    .orderBy(desc(schema.proactiveSuggestions.createdAt))
    .limit(10);
}

export async function getRecentProactiveSuggestionsForUser(userId: string) {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return db.select()
    .from(schema.proactiveSuggestions)
    .where(and(
      eq(schema.proactiveSuggestions.userId, userId),
      gt(schema.proactiveSuggestions.createdAt, oneDayAgo),
    ))
    .orderBy(desc(schema.proactiveSuggestions.createdAt));
}

/**
 * Queues a check-in for delivery. The QStash dispatcher sends it to every channel
 * the user selected, so this never depends on a channel being reachable right now.
 */
export async function dispatchProactiveSuggestion(input: {
  userId: string;
  candidate: ProactiveSuggestionCandidate;
  channelPref: ProactiveChannel;
}) {
  const channels = expandChannelPreference(input.channelPref);
  const id = await enqueueNotification({
    userId: input.userId,
    kind: input.candidate.type,
    content: input.candidate.content,
    channels,
  });

  return {
    success: true,
    queuedId: id,
    dispatchedTo: channels as string[],
    content: input.candidate.content,
  };
}
