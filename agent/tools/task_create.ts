import { defineTool } from "eve/tools";
import { z } from "zod";
import { requireUserId } from "../lib/principal.js";
import { createTask } from "../lib/tasks-internal.js";

export default defineTool({
  description:
    "Create a tracked task or commitment for the current user (e.g. a follow-up, a deadline, a promise to check back). Use this for anything the user wants remembered as actionable, not for stable facts (those go in memory).",
  inputSchema: z.object({
    title: z.string().min(1).max(200).describe("Short, actionable title"),
    notes: z.string().max(4000).optional().describe("Optional context or details"),
    dueAt: z.string().datetime({ offset: true }).optional().describe("Optional due time as an ISO 8601 timestamp with offset"),
    remindAt: z.string().datetime({ offset: true }).optional().describe("Optional time to send the user a reminder, as an ISO 8601 timestamp with offset. Omit for no reminder."),
    source: z.enum(["chat", "meeting", "proactive", "slack", "telegram", "photon"]).default("chat"),
  }),
  outputSchema: z.object({ id: z.string(), title: z.string(), dueAt: z.number().nullable() }),
  async execute({ title, notes, dueAt, remindAt, source }, ctx) {
    const userId = requireUserId(ctx.session.auth.current?.principalId);
    const task = await createTask({ userId, title, notes, dueAt: dueAt ?? null, notifyAt: remindAt ?? null, source });
    return { id: task.id, title: task.title, dueAt: task.dueAt };
  },
});
