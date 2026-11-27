import { relations } from "drizzle-orm";
import { index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth";

export const meetings = pgTable(
  "meetings",
  {
    id: text("id").primaryKey(), // local meeting UUID
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    botId: text("bot_id").notNull(),
    bridgeToken: text("bridge_token").unique(), // authenticates Deepgram function calls for this meeting
    agentSessionId: text("agent_session_id"), // Eve session that handles voice requests for this meeting
    meetingUrl: text("meeting_url").notNull(),
    title: text("title"),
    botName: text("bot_name").default("Thinky Assistant").notNull(),
    status: text("status").default("scheduled").notNull(), // scheduled, in_call, done, fatal
    recordingId: text("recording_id"),
    transcriptId: text("transcript_id"),
    transcriptText: text("transcript_text"),
    transcriptData: jsonb("transcript_data"), // Array of ReadableTranscriptEntry
    summary: text("summary"),
    joinAt: timestamp("join_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("meetings_user_idx").on(table.userId, table.updatedAt),
    index("meetings_bot_idx").on(table.botId),
  ],
);

export const meetingsRelations = relations(meetings, ({ one }) => ({
  user: one(user, {
    fields: [meetings.userId],
    references: [user.id],
  }),
}));
