import { and, eq, gt, lt } from "drizzle-orm";
import { db, schema } from "@nuxthub/db";

export async function recordComposioSignal(input: { userId: string; toolkit: string; triggerSlug: string }) {
  await db.insert(schema.agentSignals).values({
    id: crypto.randomUUID(),
    userId: input.userId,
    toolkit: input.toolkit,
    triggerSlug: input.triggerSlug,
  });
}

/** Distinct toolkit names with activity in the window, e.g. ["gmail", "github"]. */
export async function listRecentToolkits(userId: string, hours: number): Promise<string[]> {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  const rows = await db.select({ toolkit: schema.agentSignals.toolkit })
    .from(schema.agentSignals)
    .where(and(eq(schema.agentSignals.userId, userId), gt(schema.agentSignals.createdAt, since)));

  return [...new Set(rows.map(r => r.toolkit))];
}

export async function countRecentSignals(userId: string, hours: number): Promise<number> {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  const rows = await db.select({ id: schema.agentSignals.id })
    .from(schema.agentSignals)
    .where(and(eq(schema.agentSignals.userId, userId), gt(schema.agentSignals.createdAt, since)));
  return rows.length;
}

/** Signals are only useful for a few days, so older ones are removed. */
export async function pruneOldSignals(days = 7) {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  await db.delete(schema.agentSignals).where(lt(schema.agentSignals.createdAt, cutoff));
}
