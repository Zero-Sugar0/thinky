import { relations } from "drizzle-orm";
import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { threads } from "./threads";

export const proactiveSuggestions = pgTable("proactive_suggestions", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  threadId: text("thread_id")
    .references(() => threads.id, { onDelete: "set null" }),
  channel: text("channel").notNull().default("chat"),
  content: text("content").notNull(),
  type: text("type").notNull().default("reminder"), // "lunch" | "client_followup" | "undone_task" | "reminder"
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("proactive_suggestions_user_idx").on(table.userId, table.createdAt),
]);

export const proactiveSuggestionsRelations = relations(proactiveSuggestions, ({ one }) => ({
  user: one(user, {
    fields: [proactiveSuggestions.userId],
    references: [user.id],
  }),
  thread: one(threads, {
    fields: [proactiveSuggestions.threadId],
    references: [threads.id],
  }),
}));
