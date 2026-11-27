import { defineTool } from "eve/tools";
import { z } from "zod";
import { requireUserId } from "../lib/principal.js";
import { updateTask } from "../lib/tasks-internal.js";

export default defineTool({
  description:
    "Update one of the current user's tasks: mark it done or cancelled, reschedule it (dueAt), or edit its title or notes. Pass dueAt as null to clear the due date. Use task_list first to find the task id.",
  inputSchema: z.object({
    id: z.string().min(1).describe("The task id from task_list or task_create"),
    status: z.enum(["open", "done", "cancelled"]).optional(),
    title: z.string().min(1).max(200).optional(),
    notes: z.string().max(4000).optional(),
    dueAt: z.string().datetime({ offset: true }).nullable().optional(),
  }),
  outputSchema: z.object({ id: z.string(), status: z.string(), dueAt: z.number().nullable() }),
  async execute({ id, status, title, notes, dueAt }, ctx) {
    const userId = requireUserId(ctx.session.auth.current?.principalId);
    const task = await updateTask(userId, id, { status, title, notes, dueAt });
    return { id: task.id, status: task.status, dueAt: task.dueAt };
  },
});
