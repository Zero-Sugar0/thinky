import { defineChannel, POST } from "eve/channels";
import { Spectrum } from "spectrum-ts";
import { imessage } from "@spectrum-ts/imessage";
import { agent } from "../../shared/agent.js";
import { fetchPhoneLink } from "../lib/phone-internal.js";
import { saveDeliveryTarget } from "../lib/delivery-targets-internal.js";
import { isSpeechConfigured, transcribeAudio } from "../../server/utils/speech.js";
import { buildAppSessionAuth } from "../../shared/app-auth.js";

// iMessage through Photon 2.0 (Spectrum). Photon posts signed webhooks to
// /imessage/webhook; each inbound message starts or continues an agent session
// keyed to its iMessage conversation, and the agent's reply goes back out
// through the same Spectrum space.
//
// Enabled when IMESSAGE_PROJECT_ID is set. The Eve Photon channel
// (agent/channels/photon.ts) stands down in that case so messages are not
// answered twice.

const TITLE = "iMessage";
const MAX_REPLY_CHARS = 1500;
const SEEN_LIMIT = 500;

type SendOptions = { auth: ReturnType<typeof buildAppSessionAuth> | null; title?: string; context?: string[] };
type FromFn = (address: string) => { send: (text: string, options: SendOptions) => Promise<unknown> };

const spacesByAddress = new Map<string, SpaceLike>();
const seenMessageIds: string[] = [];

type SpaceLike = { id: string; __platform: string; type?: string };
// The subset of the Spectrum v2 client this channel uses. Declared here rather than
// inferred from Spectrum()'s overloads, which are heavy enough to destabilise typecheck.
interface SpectrumClient {
  webhook(
    request: Request,
    handler: (space: unknown, message: unknown) => void | Promise<void>,
  ): Promise<Response>;
  send(space: never, content: string): Promise<unknown>;
}
type InboundContent = {
  type: string;
  text?: string;
  mimeType?: string;
  read?: () => Promise<Buffer>;
};
type InboundMessage = {
  id: string;
  content: InboundContent;
  sender?: { id: string; kind?: string; platform?: string };
};

export function isSpectrumEnabled(): boolean {
  return Boolean(process.env.IMESSAGE_PROJECT_ID);
}

let spectrumPromise: Promise<SpectrumClient> | undefined;

function getSpectrum(): Promise<SpectrumClient> {
  if (!spectrumPromise) {
    const projectId = process.env.IMESSAGE_PROJECT_ID;
    const projectSecret = process.env.IMESSAGE_PROJECT_SECRET;
    if (!projectId || !projectSecret) {
      throw new Error("IMESSAGE_PROJECT_ID and IMESSAGE_PROJECT_SECRET are required for Photon 2.0.");
    }
    spectrumPromise = Promise.resolve(Spectrum({
      projectId,
      projectSecret,
      webhookSecret: process.env.IMESSAGE_WEBHOOK_SECRET,
      providers: [imessage.config()],
    })).then(client => client as unknown as SpectrumClient);
  }
  return spectrumPromise;
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

/** Voice notes become text here so the agent reads them like typed messages. */
async function messageText(content: InboundContent): Promise<string | undefined> {
  if (content.type === "text" && content.text) return content.text;

  if (content.type === "voice" && content.read) {
    if (!isSpeechConfigured()) {
      return "[The caller sent a voice note, but transcription is not configured.]";
    }
    try {
      const audio = new Uint8Array(await content.read());
      const transcript = await transcribeAudio(audio, content.mimeType ?? "audio/mp4");
      return transcript ? `[Voice note transcript] ${transcript}` : "[Voice note with no speech in it]";
    }
    catch (error) {
      console.warn("iMessage voice note could not be transcribed", error);
      return "[The caller sent a voice note that could not be transcribed.]";
    }
  }

  return undefined;
}

export default defineChannel({
  routes: [
    POST("/imessage/webhook", async (request, { from, waitUntil }) => {
      if (!isSpectrumEnabled()) {
        return new Response("iMessage channel is not configured", { status: 404 });
      }

      const spectrum = await getSpectrum();

      return spectrum.webhook(request, (space, rawMessage) => {
        const message = rawMessage as unknown as InboundMessage;
        // The SDK's from() carries a wider send signature than we use here; the narrowing is safe.
        const work = handleInbound(space as unknown as SpaceLike, message, from as unknown as FromFn);
        waitUntil(work);
        return work;
      });
    }),
  ],

  events: {
    async "message.completed"(event, channel) {
      const text = event.message?.trim();
      if (!text) return;

      const space = spacesByAddress.get(channel.continuation?.token ?? "");
      if (!space) {
        // The space is only known to the process that received the inbound message.
        console.warn("iMessage reply skipped: no Spectrum space cached for this conversation");
        return;
      }

      const spectrum = await getSpectrum();
      for (const chunk of chunkReply(text)) {
        await spectrum.send(space as never, chunk);
      }
    },
  },
});

async function handleInbound(
  space: SpaceLike,
  message: InboundMessage,
  from: FromFn,
) {
  if (!message?.id || !firstDelivery(message.id)) return;
  if (message.sender?.kind === "agent") return;

  const handle = message.sender?.id ?? "";
  const phoneNumber = asPhoneNumber(handle);
  const link = phoneNumber ? await fetchPhoneLink(phoneNumber) : undefined;
  const address = `imessage:${space.id}`;

  spacesByAddress.set(address, space);

  const text = await messageText(message.content);
  if (!text) {
    // Attachments and effects are not read yet. Say so rather than going silent.
    await sendReply(space, "I can read text and voice notes for now. Send it as text and I'll help.");
    return;
  }

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
  await saveDeliveryTarget(link.appUserId, "imessage", space.id).catch(() => undefined);

  await from(address).send(text, {
    auth: buildAppSessionAuth(link.appUserId, {
      name: handle,
      phone_number: link.phoneNumber,
    }),
    title: TITLE,
  });
}

async function sendReply(space: SpaceLike, text: string) {
  const spectrum = await getSpectrum();
  await spectrum.send(space as never, text);
}

export const channelName = agent.name;
