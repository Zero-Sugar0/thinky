import { defineChannel, POST } from "eve/channels";
import { Webhook } from "standardwebhooks";
import { buildAppSessionAuth } from "../../shared/app-auth.js";
import {
  AttachmentTooLargeError,
  conversationAddress,
  downloadIMessageAttachment,
  isPhotonBetaEnabled,
  markIMessageRead,
  sendIMessageText,
} from "../../shared/imessage.js";
import { isSpeechConfigured, transcribeAudio } from "../../shared/speech.js";
import { fetchPhoneLink } from "../lib/phone-internal.js";
import { saveDeliveryTarget } from "../lib/delivery-targets-internal.js";

// iMessage on Photon 2.0 Beta (api.photon.codes). Inbound messages arrive as Standard Webhooks
// deliveries; replies and proactive messages go out through shared/imessage.ts.
//
// Delivery guarantees:
// - The route returns 204 only after eve has accepted the message. eve buffers an accepted
//   message durably, so a restart after 204 does not lose it.
// - If anything fails before acceptance, the route returns 503 and Photon retries the delivery.
// - A message id is recorded only after it is handled, so a retry is not dropped as a duplicate.

const TITLE = "iMessage";
const SEEN_LIMIT = 500;

/** Inbound message as the Beta API describes it (see Photon's Messages reference). */
export type BetaMessage = {
  id: string;
  platform: string;
  status: string;
  createdAt: string;
  sentBy: { id: string; kind: string; handle: string; platform: string };
  receivedBy?: { id: string; kind: string; handle: string; platform: string } | null;
  space: { id: string; kind: string; platform: string };
  content: {
    type: string;
    format?: string;
    text?: string;
    attachmentId?: string;
    metadata?: { voice?: { transcript?: string; durationMs?: number } };
  };
};

/** Beta webhook envelope: the public event with the message under data.object. */
export type BetaWebhookEvent = {
  id: string;
  type: string;
  app_installation_id?: string;
  data: { organizationId: string; projectId: string; object: BetaMessage };
};

/** What the agent receives: text, plus image files when the person sent a photo. */
type UserPart = { type: "text"; text: string } | { type: "file"; data: Uint8Array; mediaType: string };
type SendOptions = { auth: ReturnType<typeof buildAppSessionAuth> | null; title?: string; context?: string[] };
type FromFn = (address: string) => { send: (message: string | UserPart[], options: SendOptions) => Promise<unknown> };

const handledMessageIds: string[] = [];
/** The latest inbound message per conversation, so the reply can thread under it. */
const latestInboundByAddress = new Map<string, string>();

function wasHandled(messageId: string): boolean {
  return handledMessageIds.includes(messageId);
}

function markHandled(messageId: string): void {
  handledMessageIds.push(messageId);
  if (handledMessageIds.length > SEEN_LIMIT) handledMessageIds.shift();
}

function rememberInbound(address: string, messageId: string): void {
  latestInboundByAddress.delete(address);
  latestInboundByAddress.set(address, messageId);
  if (latestInboundByAddress.size > SEEN_LIMIT) {
    const oldest = latestInboundByAddress.keys().next().value;
    if (oldest !== undefined) latestInboundByAddress.delete(oldest);
  }
}

/** iMessage handles are phone numbers or Apple IDs; only the former can match a profile. */
function asPhoneNumber(handle: string) {
  const normalized = handle.trim().startsWith("+")
    ? handle.trim()
    : `+${handle.replace(/\D/g, "")}`;

  return /^\+[1-9]\d{7,14}$/.test(normalized) ? normalized : undefined;
}

/**
 * Verifies a Photon webhook delivery with the Standard Webhooks scheme
 * (webhook-id / webhook-timestamp / webhook-signature, HMAC-SHA256). Verifies the
 * raw body bytes and rejects timestamps more than five minutes away. Returns the
 * parsed event, or undefined when verification fails.
 */
export function verifyPhotonWebhook(request: Request, rawBody: string): BetaWebhookEvent | undefined {
  const secret = process.env.PHOTON_WEBHOOK_SIGNING_SECRET;
  if (!secret) return undefined;

  const headers = {
    "webhook-id": request.headers.get("webhook-id") ?? "",
    "webhook-timestamp": request.headers.get("webhook-timestamp") ?? "",
    "webhook-signature": request.headers.get("webhook-signature") ?? "",
  };

  try {
    const event = new Webhook(secret).verify(rawBody, headers) as BetaWebhookEvent;
    return event.id === headers["webhook-id"] ? event : undefined;
  }
  catch {
    return undefined;
  }
}

const UNSUPPORTED_REPLY = "I can read text, photos, and voice notes over iMessage. Other attachments aren't supported yet.";

/**
 * Turns the message into what the agent reads. Voice notes use the platform transcript when
 * Photon provides one, otherwise Deepgram. Photos are passed as image files. Returns undefined
 * for content the agent cannot read.
 */
async function readableContent(message: BetaMessage): Promise<string | UserPart[] | undefined> {
  const { content } = message;

  if (content.type === "text" && content.format === "plain") {
    const text = content.text?.trim();
    return text || undefined;
  }

  if (content.type === "voice" && content.attachmentId) {
    const transcript = content.metadata?.voice?.transcript?.trim();
    if (transcript) return `Voice note (transcribed by iMessage): ${transcript}`;

    if (!isSpeechConfigured()) return "The user sent a voice note, but transcription is not configured on this agent.";
    const audio = await downloadIMessageAttachment(content.attachmentId);
    const text = (await transcribeAudio(audio.bytes, audio.contentType)).trim();
    return text ? `Voice note (transcribed): ${text}` : "The user sent a voice note, but nothing was audible in it.";
  }

  if (content.type === "attachment" && content.attachmentId) {
    const file = await downloadIMessageAttachment(content.attachmentId);
    if (file.contentType.startsWith("image/")) {
      return [
        { type: "text", text: "The user sent this photo over iMessage." },
        { type: "file", data: file.bytes, mediaType: file.contentType },
      ];
    }
    return undefined;
  }

  return undefined;
}

/**
 * Turns one verified inbound message into an agent turn. Throws when the message could not be
 * accepted (or a transient Photon or Deepgram call fails), so the caller can return 503 and
 * Photon retries. Permanent problems get a reply and count as handled.
 */
export async function handleInbound(message: BetaMessage, from: FromFn): Promise<void> {
  if (!message?.id || wasHandled(message.id)) return;
  if (message.status !== "received" || message.platform !== "imessage") return markHandled(message.id);
  if (message.sentBy.kind === "agent" || !message.receivedBy) return markHandled(message.id);

  // Group conversations are not supported yet; shared lines are direct-only.
  if (message.space.kind !== "direct") return markHandled(message.id);

  const address = conversationAddress(message.space.id, message.receivedBy.id);

  let content: string | UserPart[] | undefined;
  try {
    content = await readableContent(message);
  }
  catch (error) {
    if (error instanceof AttachmentTooLargeError) {
      await reply(address, "That file is too large for me to read. Please send a smaller one.", `too-large:${message.id}`);
      return markHandled(message.id);
    }
    throw error;
  }

  if (!content) {
    await reply(address, UNSUPPORTED_REPLY, `unsupported:${message.id}`);
    return markHandled(message.id);
  }

  // Tell Photon the message was read. A failure here must not block the reply.
  await markIMessageRead(message.id, `read:${message.id}`).catch(() => undefined);

  const handle = message.sentBy.handle;
  const phoneNumber = asPhoneNumber(handle);
  const link = phoneNumber ? await fetchPhoneLink(phoneNumber) : undefined;

  if (!link) {
    await from(address).send(content, {
      auth: null,
      title: TITLE,
      context: [
        "This number is not on any Thinky profile, so you have no access to the caller's memory or integrations.",
        "If they ask for anything that needs those, tell them to add this number under Settings → Profile.",
      ],
    });
    rememberInbound(address, message.id);
    return markHandled(message.id);
  }

  // Remember the conversation so proactive messages can reach the user here later.
  await saveDeliveryTarget(link.appUserId, "imessage", address).catch(() => undefined);

  rememberInbound(address, message.id);
  await from(address).send(content, {
    auth: buildAppSessionAuth(link.appUserId, {
      name: handle,
      phone_number: link.phoneNumber,
    }),
    title: TITLE,
  });
  markHandled(message.id);
}

/** Sends a reply to the conversation. Errors propagate so the webhook can ask Photon to retry. */
async function reply(address: string, text: string, key: string, parentMessageId?: string): Promise<void> {
  await sendIMessageText(address, text, key, parentMessageId);
}

export default defineChannel({
  routes: [
    POST("/imessage/webhook", async (request, { from }) => {
      if (!isPhotonBetaEnabled()) {
        return new Response("iMessage channel is not configured", { status: 404 });
      }

      const rawBody = await request.text();
      const event = verifyPhotonWebhook(request, rawBody);
      if (!event) {
        // Photon's documented response for failed verification.
        return new Response("Webhook verification failed", { status: 400 });
      }

      // Only inbound messages are handled here; other event types are acknowledged and ignored.
      if (event.type !== "message.received") {
        return new Response(null, { status: 204 });
      }

      try {
        await handleInbound(event.data.object, from as unknown as FromFn);
      }
      catch (error) {
        console.error("[imessage] inbound not accepted; asking Photon to retry", error);
        return new Response("Temporarily unavailable", { status: 503 });
      }
      return new Response(null, { status: 204 });
    }),
  ],

  events: {
    async "message.completed"(event, channel) {
      const text = event.message?.trim();
      if (!text) return;
      const address = channel.continuation?.token ?? "";
      try {
        const parent = latestInboundByAddress.get(address);
        await reply(address, text, `reply:${channel.continuation?.token}:${event.turnId}`, parent);
      }
      catch (error) {
        console.error("[imessage] reply failed", error);
      }
    },
  },
});
