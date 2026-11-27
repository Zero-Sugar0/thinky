import { defineTool } from "eve/tools";
import { z } from "zod";
import { requireUserId } from "../lib/principal.js";
import { listTasks } from "../lib/tasks-internal.js";

export default defineTool({
  description: "List the current user's tasks and commitments. Defaults to open tasks. Use this before following up on anything the user may have left unfinished.",
  inputSchema: z.object({
    status: z.enum(["open", "done", "cancelled", "all"]).default("open"),
    limit: z.number().int().min(1).max(100).default(50),
  }),
  outputSchema: z.object({
    tasks: z.array(z.object({
      id: z.string(),
      title: z.string(),
      notes: z.string(),
      status: z.string(),
      dueAt: z.number().nullable(),
      source: z.string(),
    })),
  }),
  async execute({ status, limit }, ctx) {
    const userId = requireUserId(ctx.session.auth.current?.principalId);
    const tasks = await listTasks(userId, status, limit);
    return {
      tasks: tasks.map(t => ({ id: t.id, title: t.title, notes: t.notes, status: t.status, dueAt: t.dueAt, source: t.source })),
    };
  },
});
