import { db, schema } from "@nuxthub/db";

export type MeetingActivityKind = "status" | "request" | "answer" | "note" | "chat" | "screenshare" | "system";

/**
 * Records one meeting event. Logging must never break the caller, so failures are
 * reported and swallowed.
 */
export async function recordMeetingActivity({
  meetingId,
  kind,
  title,
  detail,
}: {
  meetingId: string;
  kind: MeetingActivityKind;
  title: string;
  detail?: string | null;
}): Promise<void> {
  try {
    await db.insert(schema.meetingActivity).values({
      id: crypto.randomUUID(),
      meetingId,
      kind,
      title: title.slice(0, 200),
      detail: detail ? detail.slice(0, 2000) : null,
    });
  } catch (error) {
    console.error("[meeting-activity] failed to record:", error);
  }
}
