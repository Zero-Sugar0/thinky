import { asc, eq } from "drizzle-orm";
import { db, schema } from "@nuxthub/db";
import { askThinkyForMeeting } from "~~/agent/lib/meeting-bridge";
import {
  getMeetingBot,
  leaveMeetingBot,
  sendChatMessage,
  startScreenshare,
  stopScreenshare,
} from "~~/agent/lib/recall";

const ASK_TIMEOUT_MS = 15_000;

/**
 * Bridge from the Deepgram voice agent to Thinky's tools. Each call is authenticated
 * with the meeting's bridge token, so a call can only act on its own meeting.
 */
export default defineEventHandler(async (event) => {
  const tool = getRouterParam(event, "tool");
  const token = getHeader(event, "authorization")?.replace(/^Bearer\s+/i, "").trim();
  if (!token || !tool) {
    throw createError({ statusCode: 401, statusMessage: "Missing bridge credentials" });
  }

  const [meeting] = await db
    .select()
    .from(schema.meetings)
    .where(eq(schema.meetings.bridgeToken, token))
    .limit(1);

  if (!meeting) {
    throw createError({ statusCode: 401, statusMessage: "Unknown bridge token" });
  }

  const raw = (await readBody(event).catch(() => ({}))) ?? {};
  const input = typeof raw.arguments === "string" ? JSON.parse(raw.arguments) : raw;
  const botId = meeting.botId;

  try {
    switch (tool) {
      case "ask_thinky": {
        const request = String(input.request ?? "").trim();
        if (!request) return { result: "Tell me what you'd like me to do." };

        const { sessionId, reply } = await askThinkyForMeeting({
          userId: meeting.userId,
          sessionId: meeting.agentSessionId,
          request,
          timeoutMs: ASK_TIMEOUT_MS,
        });

        if (sessionId !== meeting.agentSessionId) {
          await db
            .update(schema.meetings)
            .set({ agentSessionId: sessionId })
            .where(eq(schema.meetings.id, meeting.id));
        }

        const answer = await reply;
        // When the wait ran out, post the real answer to chat once it finishes.
        if (answer.startsWith("I'm still working")) {
          reply
            .then(async (late) => {
              if (late) await sendChatMessage(botId, late);
            })
            .catch((error) => console.error("[meeting-bridge] late answer failed:", error));
        }
        return { result: answer };
      }

      case "send_chat": {
        const message = String(input.message ?? "").trim();
        if (!message) return { result: "Nothing to post." };
        await sendChatMessage(botId, message.slice(0, 1000));
        return { result: "Posted to the meeting chat." };
      }

      case "share_screen": {
        const url = String(input.url ?? "").trim();
        if (!url.startsWith("https://")) return { result: "Only public https:// pages can be shared." };
        await startScreenshare(botId, url);
        return { result: "Sharing the page now. It takes a few seconds to load." };
      }

      case "stop_share": {
        await stopScreenshare(botId);
        return { result: "Stopped sharing." };
      }

      case "leave_meeting": {
        await leaveMeetingBot(botId);
        return { result: "Leaving the meeting." };
      }

      case "note_add": {
        const kind = String(input.kind ?? "note");
        const detail = String(input.detail ?? "").trim();
        if (!detail) return { result: "Nothing to note." };

        await db.insert(schema.meetingNotes).values({
          id: crypto.randomUUID(),
          meetingId: meeting.id,
          kind,
          person: optionalText(input.person),
          item: optionalText(input.item),
          quantity: optionalText(input.quantity),
          detail: detail.slice(0, 1000),
        });
        return { result: "Noted." };
      }

      case "note_list": {
        const notes = await db
          .select()
          .from(schema.meetingNotes)
          .where(eq(schema.meetingNotes.meetingId, meeting.id))
          .orderBy(asc(schema.meetingNotes.createdAt));

        if (notes.length === 0) return { result: "No notes yet." };
        return {
          result: notes
            .map((note) => {
              const who = note.person ? `${note.person}: ` : "";
              const qty = note.quantity ? ` (${note.quantity})` : "";
              const item = note.item ? ` ${note.item}${qty}` : qty;
              return `${note.kind}. ${who}${note.detail}${item ? ` [${item.trim()}]` : ""}`;
            })
            .join("\n"),
        };
      }

      default:
        throw createError({ statusCode: 404, statusMessage: `Unknown bridge tool: ${tool}` });
    }
  } catch (error) {
    if (typeof error === "object" && error && "statusCode" in error) throw error;
    console.error(`[meeting-bridge] ${tool} failed:`, error);
    return { result: "That didn't work. Tell the participants so and offer another way." };
  }
});

function optionalText(value: unknown): string | null {
  const text = typeof value === "string" ? value.trim() : "";
  return text ? text.slice(0, 200) : null;
}
