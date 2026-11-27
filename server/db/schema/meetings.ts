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

/**
 * Notes the voice agent takes during a meeting: orders, commitments, decisions,
 * action items, and open questions. They become the meeting outcome.
 */
export const meetingNotes = pgTable(
  "meeting_notes",
  {
    id: text("id").primaryKey(),
    meetingId: text("meeting_id")
      .notNull()
      .references(() => meetings.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(), // order, commitment, decision, action, question, note
    person: text("person"),
    item: text("item"),
    quantity: text("quantity"),
    detail: text("detail").notNull(),
    status: text("status").default("open").notNull(), // open, done, dropped
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("meeting_notes_meeting_idx").on(table.meetingId, table.createdAt)],
);

/**
 * One row per thing that happened in a meeting: bot status changes, requests Thinky
 * handled, notes, chat, and screenshare. The meeting page shows it live and after the call.
 */
export const meetingActivity = pgTable(
  "meeting_activity",
  {
    id: text("id").primaryKey(),
    meetingId: text("meeting_id")
      .notNull()
      .references(() => meetings.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(), // status, request, answer, note, chat, screenshare, system
    title: text("title").notNull(),
    detail: text("detail"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("meeting_activity_meeting_idx").on(table.meetingId, table.createdAt)],
);
