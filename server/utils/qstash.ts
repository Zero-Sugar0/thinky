import { Receiver } from "@upstash/qstash";
import type { H3Event } from "h3";

/**
 * Accepts a request from Upstash QStash (verified by signature), or from an internal
 * or cron bearer secret. In local development without signing keys, it is allowed.
 */
export async function verifyQStashOrSecret(event: H3Event): Promise<boolean> {
  const currentSigningKey = process.env.QSTASH_CURRENT_SIGNING_KEY;
  const nextSigningKey = process.env.QSTASH_NEXT_SIGNING_KEY;
  const internalSecret = process.env.INTERNAL_API_SECRET;
  const cronSecret = process.env.CRON_SECRET;

  const authHeader = getHeader(event, "authorization");
  if (authHeader) {
    const bearer = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (internalSecret && bearer === internalSecret) return true;
    if (cronSecret && bearer === cronSecret) return true;
  }

  const signature = getHeader(event, "upstash-signature");
  if (currentSigningKey && signature) {
    try {
      const receiver = new Receiver({
        currentSigningKey,
        nextSigningKey: nextSigningKey || currentSigningKey,
      });
      const body = await readRawBody(event, "utf-8");
      const url = getRequestURL(event).toString();
      return await receiver.verify({ signature, body: body || "", url });
    }
    catch {
      return false;
    }
  }

  return import.meta.dev;
}
