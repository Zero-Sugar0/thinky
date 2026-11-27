import { and, desc, eq } from "drizzle-orm";
import { db, schema } from "@nuxthub/db";
import type { AgentTask, AgentTaskSource, AgentTaskStatus } from "#shared/types/tasks";

function rowToTask(row: typeof schema.agentTasks.$inferSelect): AgentTask {
  return {
    id: row.id,
    title: row.title,
    notes: row.notes,
    status: row.status as AgentTaskStatus,
    source: row.source as AgentTaskSource,
    dueAt: row.dueAt?.getTime() ?? null,
    notifyAt: row.notifyAt?.getTime() ?? null,
    notifiedAt: row.notifiedAt?.getTime() ?? null,
    completedAt: row.completedAt?.getTime() ?? null,
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
  };
}

export async function listTasksForUser(
  userId: string,
  status: AgentTaskStatus | "all",
  limit: number,
): Promise<AgentTask[]> {
  const where = status === "all"
    ? eq(schema.agentTasks.userId, userId)
    : and(eq(schema.agentTasks.userId, userId), eq(schema.agentTasks.status, status));

  const rows = await db.select()
    .from(schema.agentTasks)
    .where(where)
    .orderBy(desc(schema.agentTasks.updatedAt))
    .limit(limit);

  return rows.map(rowToTask);
}

export async function createTaskForUser(input: {
  userId: string;
  title: string;
  notes: string;
  dueAt?: Date | null;
  notifyAt?: Date | null;
  source: AgentTaskSource;
}): Promise<AgentTask> {
  const id = crypto.randomUUID();
  await db.insert(schema.agentTasks).values({
    id,
    userId: input.userId,
    title: input.title,
    notes: input.notes,
    dueAt: input.dueAt ?? null,
    notifyAt: input.notifyAt ?? null,
    source: input.source,
  });

  const [row] = await db.select()
    .from(schema.agentTasks)
    .where(eq(schema.agentTasks.id, id))
    .limit(1);
  return rowToTask(row!);
}

export async function updateTaskForUser(
  userId: string,
  id: string,
  patch: {
    title?: string;
    notes?: string;
    dueAt?: Date | null;
    notifyAt?: Date | null;
    status?: "open" | "done" | "cancelled";
  },
): Promise<AgentTask | null> {
  const [existing] = await db.select()
    .from(schema.agentTasks)
    .where(and(eq(schema.agentTasks.id, id), eq(schema.agentTasks.userId, userId)))
    .limit(1);
  if (!existing) return null;

  const completedAt = patch.status === "done"
    ? (existing.completedAt ?? new Date())
    : patch.status
      ? null
      : existing.completedAt;

  await db.update(schema.agentTasks)
    .set({
      title: patch.title ?? existing.title,
      notes: patch.notes ?? existing.notes,
      dueAt: patch.dueAt === undefined ? existing.dueAt : patch.dueAt,
      notifyAt: patch.notifyAt === undefined ? existing.notifyAt : patch.notifyAt,
      // Changing the reminder time re-arms the reminder.
      notifiedAt: patch.notifyAt === undefined ? existing.notifiedAt : null,
      status: patch.status ?? existing.status,
      completedAt,
    })
    .where(and(eq(schema.agentTasks.id, id), eq(schema.agentTasks.userId, userId)));

  const [row] = await db.select()
    .from(schema.agentTasks)
    .where(eq(schema.agentTasks.id, id))
    .limit(1);
  return row ? rowToTask(row) : null;
}
