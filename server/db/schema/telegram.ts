import { index, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

/** A Telegram account linked to one Thinky user. Telegram user ids are globally unique. */
export const telegramLinks = pgTable("telegram_links", {
  telegramUserId: text("telegram_user_id").primaryKey(),
  appUserId: text("app_user_id").notNull(),
  telegramChatId: text("telegram_chat_id").notNull(),
  telegramUsername: text("telegram_username"),
  telegramDisplayName: text("telegram_display_name"),
  linkedAt: timestamp("linked_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow(),
}, (table) => [
  uniqueIndex("telegram_links_app_user_idx").on(table.appUserId),
]);

export const telegramLinkCodes = pgTable("telegram_link_codes", {
  code: text().primaryKey(),
  appUserId: text("app_user_id").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true, mode: "string" }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow(),
}, (table) => [
  index("telegram_link_codes_app_user_idx").on(table.appUserId),
]);
