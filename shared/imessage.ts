import { Photon } from "@photon-ai/api";

// iMessage on Photon 2.0 Beta, shared by the agent channel (replies) and the server
// dispatcher (proactive messages and reminders). Both run in Node and send through the same
// project, so neither needs an agent turn to deliver a message.

export const IMESSAGE_MAX_CHARS = 1500;
const ADDRESS_PREFIX = "imessage:";

/** Conversation address: the Space and the agent's User, so any instance can send without stored state. */
export function conversationAddress(spaceId: string, agentId: string): string {
  return `${ADDRESS_PREFIX}${spaceId}|${agentId}`;
}

export function parseConversationAddress(address: string): { spaceId: string; agentId: string } | undefined {
  if (!address.startsWith(ADDRESS_PREFIX)) return undefined;
  const [spaceId, agentId] = address.slice(ADDRESS_PREFIX.length).split("|");
  return spaceId && agentId ? { spaceId, agentId } : undefined;
}

/** Splits long text at line breaks where possible so each iMessage stays readable. */
export function chunkIMessageText(text: string, max = IMESSAGE_MAX_CHARS): string[] {
  const chunks: string[] = [];
  let rest = text.trim();
  while (rest.length > max) {
    const cut = rest.lastIndexOf("\n", max);
    const at = cut > max / 2 ? cut : max;
    chunks.push(rest.slice(0, at).trim());
    rest = rest.slice(at).trim();
  }
  if (rest) chunks.push(rest);
  return chunks;
}

/** True when the Beta project, API key, and webhook signing secret are all set. */
export function isPhotonBetaEnabled(): boolean {
  return Boolean(process.env.PHOTON_PROJECT_ID && process.env.PHOTON_API_KEY && process.env.PHOTON_WEBHOOK_SIGNING_SECRET);
}

let client: Photon | undefined;

function photon(): Photon {
  if (!client) {
    const key = process.env.PHOTON_API_KEY;
    if (!key) throw new Error("PHOTON_API_KEY is required for iMessage.");
    client = new Photon({ headers: { Authorization: `Bearer ${key}` } });
  }
  return client;
}

/**
 * Sends text to one conversation. The idempotency key is derived from the reply, not the attempt,
 * so a retried delivery cannot send the same text twice. Throws when Photon rejects a chunk; the
 * caller decides whether to retry later.
 */
export async function sendIMessageText(address: string, text: string, idempotencyKey: string): Promise<void> {
  const target = parseConversationAddress(address);
  const projectId = process.env.PHOTON_PROJECT_ID;
  if (!target) throw new Error("Not an iMessage conversation address.");
  if (!projectId) throw new Error("PHOTON_PROJECT_ID is required for iMessage.");

  for (const [index, chunk] of chunkIMessageText(text).entries()) {
    await photon().projects.sendMessage({
      path: { id: projectId },
      headers: { "idempotency-key": `${idempotencyKey}:${index}` },
      body: {
        spaceId: target.spaceId,
        senderId: target.agentId,
        content: { type: "text", format: "plain", text: chunk },
      },
    });
  }
}
