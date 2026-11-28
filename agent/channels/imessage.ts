import { defineChannel, POST } from "eve/channels";
import { Photon } from "@photon-ai/api";
import { Webhook } from "standardwebhooks";
import { buildAppSessionAuth } from "../../shared/app-auth.js";
import { fetchPhoneLink } from "../lib/phone-internal.js";
import { saveDeliveryTarget } from "../lib/delivery-targets-internal.js";

// iMessage on Photon 2.0 (the Beta platform, api.photon.codes, @photon-ai/api).
//
// Status: outbound replies are implemented against the Beta SDK. Inbound delivery is
// NOT live yet: the route fails closed (401) until the Beta webhook signature
// verification is implemented from the Photon webhook docs. Nothing is accepted unverified.
//
// Replies need no in-memory state. The conversation's Space ID and the agent's User ID
// are encoded in the channel's conversation address, so any instance can reply.

const TITLE = "iMessage";
const MAX_REPLY_CHARS = 1500;
const SEEN_LIMIT = 500;
const ADDRESS_PREFIX = "imessage:";

type SendOptions = { auth: ReturnType<typeof buildAppSessionAuth> | null; title?: string; context?: string[] };
type FromFn = (address: string) => { send: (text: string, options: SendOptions) => Promise<unknown> };

/** Inbound message as the Beta API describes it (see Photon's Messages reference). */
export type BetaMessage = {
  id: string;
  platform: string;
  status: string;
  createdAt: string;
  sentBy: { id: string; kind: string; handle: string; platform: string };
  receivedBy?: { id: string; kind: string; handle: string; platform: string } | null;
  space: { id: string; kind: string; platform: string };
  content: { type: string; format?: string; text?: string };
};

const seenMessageIds: string[] = [];

/** Beta webhook envelope: the public event with the message under data.object. */
export type BetaWebhookEvent = {
  id: string;
  type: string;
  app_installation_id?: string;
  data: { organizationId: string; projectId: string; object: BetaMessage };
};

export function isPhotonBetaEnabled(): boolean {
  return Boolean(process.env.PHOTON_PROJECT_ID && process.env.PHOTON_API_KEY && process.env.PHOTON_WEBHOOK_SIGNING_SECRET);
}

let client: Photon | undefined;

function photon(): Photon {
  if (!client) {
    const key = process.env.PHOTON_API_KEY;
    if (!key) throw new Error("PHOTON_API_KEY is required for Photon 2.0.");
    client = new Photon({ headers: { Authorization: `Bearer ${key}` } });
  }
  return client;
}

/** Remembers a message id so at-least-once webhook redelivery does not start a second turn. */
function firstDelivery(messageId: string): boolean {
  if (seenMessageIds.includes(messageId)) return false;
  seenMessageIds.push(messageId);
  if (seenMessageIds.length > SEEN_LIMIT) seenMessageIds.shift();
  return true;
}

/** iMessage handles are phone numbers or Apple IDs; only the former can match a profile. */
function asPhoneNumber(handle: string) {
  const normalized = handle.trim().startsWith("+")
    ? handle.trim()
    : `+${handle.replace(/\D/g, "")}`;

  return /^\+[1-9]\d{7,14}$/.test(normalized) ? normalized : undefined;
}

function chunkReply(text: string): string[] {
  const chunks: string[] = [];
  let rest = text.trim();
  while (rest.length > MAX_REPLY_CHARS) {
    const cut = rest.lastIndexOf("\n", MAX_REPLY_CHARS);
    const at = cut > MAX_REPLY_CHARS / 2 ? cut : MAX_REPLY_CHARS;
    chunks.push(rest.slice(0, at).trim());
    rest = rest.slice(at).trim();
  }
  if (rest) chunks.push(rest);
  return chunks;
}

/** Conversation address: the Space and the agent's User, so replies need no stored state. */
export function conversationAddress(spaceId: string, agentId: string): string {
  return `${ADDRESS_PREFIX}${spaceId}|${agentId}`;
}

export function parseConversationAddress(address: string): { spaceId: string; agentId: string } | undefined {
  if (!address.startsWith(ADDRESS_PREFIX)) return undefined;
  const [spaceId, agentId] = address.slice(ADDRESS_PREFIX.length).split("|");
  return spaceId && agentId ? { spaceId, agentId } : undefined;
}

/** Sends one reply through the Beta API. The idempotency key ties it to the reply, not the attempt. */
export async function sendIMessageReply(address: string, text: string, replyKey: string): Promise<void> {
  const target = parseConversationAddress(address);
  const projectId = process.env.PHOTON_PROJECT_ID;
  if (!target || !projectId) return;

  const chunks = chunkReply(text);
  for (const [index, chunk] of chunks.entries()) {
    await photon().projects.sendMessage({
      path: { id: projectId },
      headers: { "idempotency-key": `${replyKey}:${index}` },
      body: {
        spaceId: target.spaceId,
        senderId: target.agentId,
        content: { type: "text", format: "plain", text: chunk },
      },
    });
  }
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

/** Turns one verified inbound message into an agent turn. */
export async function handleInbound(message: BetaMessage, from: FromFn): Promise<void> {
  if (!message?.id || !firstDelivery(message.id)) return;
  if (message.status !== "received" || message.platform !== "imessage") return;
  if (message.sentBy.kind === "agent" || !message.receivedBy) return;
  if (message.space.kind !== "direct") return;

  const address = conversationAddress(message.space.id, message.receivedBy.id);
  const text = message.content.type === "text" && message.content.format === "plain" ? message.content.text?.trim() : undefined;

  if (!text) {
    await sendIMessageReply(address, "I can read text messages for now. Send it as text and I'll help.", `unsupported:${message.id}`);
    return;
  }

  const handle = message.sentBy.handle;
  const phoneNumber = asPhoneNumber(handle);
  const link = phoneNumber ? await fetchPhoneLink(phoneNumber) : undefined;

  if (!link) {
    await from(address).send(text, {
      auth: null,
      title: TITLE,
      context: [
        "This number is not on any Thinky profile, so you have no access to the caller's memory or integrations.",
        "If they ask for anything that needs those, tell them to add this number under Settings → Profile.",
      ],
    });
    return;
  }

  // Remember the conversation so proactive messages can reach the user here later.
  await saveDeliveryTarget(link.appUserId, "imessage", address).catch(() => undefined);

  await from(address).send(text, {
    auth: buildAppSessionAuth(link.appUserId, {
      name: handle,
      phone_number: link.phoneNumber,
    }),
    title: TITLE,
  });
}

export default defineChannel({
  routes: [
    POST("/imessage/webhook", async (request, { from, waitUntil }) => {
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

      const work = handleInbound(event.data.object, from as unknown as FromFn);
      waitUntil(work);
      return new Response(null, { status: 204 });
    }),
  ],

  events: {
    async "message.completed"(event, channel) {
      const text = event.message?.trim();
      if (!text) return;
      await sendIMessageReply(channel.continuation?.token ?? "", text, `reply:${channel.continuation?.token}:${event.turnId}`);
    },
  },
});

