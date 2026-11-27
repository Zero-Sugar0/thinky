import { desc, eq } from "drizzle-orm";
import { db, schema } from "@nuxthub/db";
import type { AgentActionLogEntry } from "#shared/types/tasks";

export async function recordAgentAction(input: {
  userId: string;
  toolSlug: string;
  toolkit?: string | null;
  status: string;
  summary: string;
  externalLogId?: string | null;
}): Promise<void> {
  await db.insert(schema.agentActionLog).values({
    id: crypto.randomUUID(),
    userId: input.userId,
    toolSlug: input.toolSlug,
    toolkit: input.toolkit ?? null,
    status: input.status,
    summary: input.summary,
    externalLogId: input.externalLogId ?? null,
  });
}

export async function listAgentActionsForUser(userId: string, limit: number): Promise<AgentActionLogEntry[]> {
  const rows = await db.select()
    .from(schema.agentActionLog)
    .where(eq(schema.agentActionLog.userId, userId))
    .orderBy(desc(schema.agentActionLog.createdAt))
    .limit(limit);

  return rows.map(row => ({
    id: row.id,
    toolSlug: row.toolSlug,
    toolkit: row.toolkit,
    status: row.status,
    summary: row.summary,
    externalLogId: row.externalLogId,
    createdAt: row.createdAt.getTime(),
  }));
}
