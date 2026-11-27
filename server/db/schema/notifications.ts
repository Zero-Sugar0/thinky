import { index, pgTable, text, timestamp, integer } from "drizzle-orm/pg-core";
import { user } from "./auth";

/** Where the agent may reach a user on each channel, e.g. a Telegram chat or an iMessage thread. */
export const agentDeliveryTargets = pgTable("agent_delivery_targets", {
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  channel: text("channel").notNull(),
  target: text("target").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, table => [index("agent_delivery_targets_user_idx").on(table.userId)]);

/** Outbox of messages the agent should send to a user. Drained by the minute-level dispatcher. */
export const agentNotifications = pgTable("agent_notifications", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(),
  content: text("content").notNull(),
  /** Comma-separated channels the user asked for: chat, slack, imessage, telegram. */
  channels: text("channels").notNull(),
  status: text("status").notNull().default("pending"),
  attempts: integer("attempts").notNull().default(0),
  lastError: text("last_error"),
  claimedUntil: timestamp("claimed_until"),
  deliveredTo: text("delivered_to").notNull().default(""),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  sentAt: timestamp("sent_at"),
}, table => [index("agent_notifications_status_idx").on(table.status, table.createdAt)]);
