import { and, eq, sql } from "drizzle-orm";
import { db, schema } from "@nuxthub/db";
import { DELIVERY_CHANNELS, expandChannelPreference, type DeliveryChannel } from "#shared/types/delivery";
import { listThreadsForUser } from "~~/server/utils/threads";
import { recordProactiveSuggestion } from "~~/server/utils/proactive";
import { getSlackLinkForAppUser } from "~~/server/utils/slack-links";

export { DELIVERY_CHANNELS, expandChannelPreference };
export type { DeliveryChannel };

const MAX_ATTEMPTS = 5;

export interface ClaimedNotification {
  id: string;
  userId: string;
  kind: string;
  content: string;
  channels: DeliveryChannel[];
}

export interface ClaimedReminder {
  id: string;
  userId: string;
  title: string;
  notes: string;
  dueAt: string | null;
}

function parseChannels(value: string): DeliveryChannel[] {
  return value
    .split(",")
    .map(c => c.trim())
    .filter((c): c is DeliveryChannel => (DELIVERY_CHANNELS as readonly string[]).includes(c));
}

export async function upsertDeliveryTarget(userId: string, channel: DeliveryChannel, target: string) {
  await db.insert(schema.agentDeliveryTargets)
    .values({ userId, channel, target })
    .onConflictDoUpdate({
      target: [schema.agentDeliveryTargets.userId, schema.agentDeliveryTargets.channel],
      set: { target, updatedAt: new Date() },
    });
}

export async function listDeliveryTargets(userId: string): Promise<Partial<Record<DeliveryChannel, string>>> {
  const rows = await db.select()
    .from(schema.agentDeliveryTargets)
    .where(eq(schema.agentDeliveryTargets.userId, userId));

  const targets: Partial<Record<DeliveryChannel, string>> = {};
  for (const row of rows) {
    if ((DELIVERY_CHANNELS as readonly string[]).includes(row.channel)) {
      targets[row.channel as DeliveryChannel] = row.target;
    }
  }

  // Slack's target is the linked Slack user, which already lives in slack_links.
  if (!targets.slack) {
    const slackLink = await getSlackLinkForAppUser(userId);
    if (slackLink?.slackUserId) {
      targets.slack = slackLink.slackUserId;
    }
  }
  return targets;
}

export async function enqueueNotification(input: {
  userId: string;
  kind: string;
  content: string;
  channels: DeliveryChannel[];
}): Promise<string> {
  const id = crypto.randomUUID();
  await db.insert(schema.agentNotifications).values({
    id,
    userId: input.userId,
    kind: input.kind,
    content: input.content,
    channels: input.channels.join(","),
  });
  return id;
}

/** Atomically leases pending notifications. SKIP LOCKED means overlapping dispatcher runs never share rows. */
export async function claimNotifications(limit: number, leaseSeconds: number): Promise<ClaimedNotification[]> {
  const rows = await db.execute(sql`
    UPDATE agent_notifications
    SET claimed_until = now() + make_interval(secs => ${leaseSeconds}), attempts = attempts + 1
    WHERE id IN (
      SELECT id FROM agent_notifications
      WHERE status = 'pending'
        AND (claimed_until IS NULL OR claimed_until < now())
      ORDER BY created_at
      LIMIT ${limit}
      FOR UPDATE SKIP LOCKED
    )
    RETURNING id, user_id, kind, content, channels
  `) as unknown as Array<{ id: string; user_id: string; kind: string; content: string; channels: string }>;

  return rows.map(row => ({
    id: row.id,
    userId: row.user_id,
    kind: row.kind,
    content: row.content,
    channels: parseChannels(row.channels),
  }));
}

async function recordChatDelivery(userId: string, content: string, type: string) {
  const threads = await listThreadsForUser(userId);
  await recordProactiveSuggestion({
    userId,
    threadId: threads[0]?.id ?? null,
    channel: "chat",
    content,
    type,
  });
}

export async function completeNotification(id: string, delivered: DeliveryChannel[]) {
  const [row] = await db.select()
    .from(schema.agentNotifications)
    .where(eq(schema.agentNotifications.id, id))
    .limit(1);
  if (!row) return;

  if (delivered.includes("chat")) {
    await recordChatDelivery(row.userId, row.content, row.kind);
  }

  await db.update(schema.agentNotifications)
    .set({
      status: "sent",
      claimedUntil: null,
      deliveredTo: delivered.join(","),
      sentAt: new Date(),
      lastError: null,
    })
    .where(eq(schema.agentNotifications.id, id));
}

export async function releaseNotification(id: string, error: string) {
  const [row] = await db.select({ attempts: schema.agentNotifications.attempts })
    .from(schema.agentNotifications)
    .where(eq(schema.agentNotifications.id, id))
    .limit(1);

  const giveUp = (row?.attempts ?? 0) >= MAX_ATTEMPTS;
  await db.update(schema.agentNotifications)
    .set({
      status: giveUp ? "failed" : "pending",
      claimedUntil: null,
      lastError: error.slice(0, 500),
    })
    .where(eq(schema.agentNotifications.id, id));
}

/** Leases open tasks whose reminder time has passed and that have not been notified yet. */
export async function claimDueReminders(limit: number, leaseSeconds: number): Promise<ClaimedReminder[]> {
  const rows = await db.execute(sql`
    UPDATE agent_tasks
    SET claimed_until = now() + make_interval(secs => ${leaseSeconds})
    WHERE id IN (
      SELECT id FROM agent_tasks
      WHERE status = 'open'
        AND notify_at IS NOT NULL
        AND notify_at <= now()
        AND notified_at IS NULL
        AND (claimed_until IS NULL OR claimed_until < now())
      ORDER BY notify_at
      LIMIT ${limit}
      FOR UPDATE SKIP LOCKED
    )
    RETURNING id, user_id, title, notes, due_at
  `) as unknown as Array<{ id: string; user_id: string; title: string; notes: string; due_at: Date | null }>;

  return rows.map(row => ({
    id: row.id,
    userId: row.user_id,
    title: row.title,
    notes: row.notes,
    dueAt: row.due_at ? new Date(row.due_at).toISOString() : null,
  }));
}

export async function completeReminder(id: string, userId: string, delivered: DeliveryChannel[], text: string) {
  if (delivered.includes("chat")) {
    await recordChatDelivery(userId, text, "reminder");
  }

  await db.update(schema.agentTasks)
    .set({ notifiedAt: new Date(), claimedUntil: null })
    .where(and(eq(schema.agentTasks.id, id), eq(schema.agentTasks.userId, userId)));
}

/** Frees a reminder for another try a few minutes later. */
export async function releaseReminder(id: string, userId: string) {
  await db.update(schema.agentTasks)
    .set({
      claimedUntil: null,
      notifyAt: sql`now() + interval '5 minutes'`,
    })
    .where(and(eq(schema.agentTasks.id, id), eq(schema.agentTasks.userId, userId)));
}
