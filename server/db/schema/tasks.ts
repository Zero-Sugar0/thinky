import { relations } from "drizzle-orm";
import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth";

export const agentTasks = pgTable("agent_tasks", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  notes: text("notes").notNull().default(""),
  status: text("status").notNull().default("open"),
  source: text("source").notNull().default("chat"),
  dueAt: timestamp("due_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
}, table => [index("agent_tasks_user_status_idx").on(table.userId, table.status)]);

export const agentTasksRelations = relations(agentTasks, ({ one }) => ({
  user: one(user, {
    fields: [agentTasks.userId],
    references: [user.id],
  }),
}));

// Append-only record of external side effects the agent performed on a user's behalf.
// Arguments are deliberately not stored: only the tool slug, outcome and a short summary.
export const agentActionLog = pgTable("agent_action_log", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  toolSlug: text("tool_slug").notNull(),
  toolkit: text("toolkit"),
  status: text("status").notNull(),
  summary: text("summary").notNull().default(""),
  externalLogId: text("external_log_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, table => [index("agent_action_log_user_created_idx").on(table.userId, table.createdAt)]);
