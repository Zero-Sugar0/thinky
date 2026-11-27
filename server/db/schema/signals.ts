import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth";

/**
 * Sanitized record of a Composio trigger event (e.g. new mail arrived).
 * Only the toolkit, trigger name and time are kept. Message content is never stored.
 */
export const agentSignals = pgTable("agent_signals", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  toolkit: text("toolkit").notNull(),
  triggerSlug: text("trigger_slug").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, table => [index("agent_signals_user_created_idx").on(table.userId, table.createdAt)]);
