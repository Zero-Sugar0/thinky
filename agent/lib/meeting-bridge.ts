import { Client } from "eve/client";

import { appOrigin } from "./internal-api.js";

/**
 * Sends a voice request to the owner's full Eve agent. The agent acts as the owner,
 * so it has their memory, tasks, and connectors. Returns the reply and the session
 * ID to keep for the next request in the same meeting.
 */
export async function askThinkyForMeeting({
  userId,
  sessionId,
  request,
  timeoutMs,
}: {
  userId: string;
  sessionId: string | null;
  request: string;
  timeoutMs: number;
}): Promise<{ sessionId: string; reply: Promise<string> }> {
  const secret = process.env.INTERNAL_API_SECRET?.trim();
  if (!secret) {
    throw new Error("INTERNAL_API_SECRET is not configured");
  }

  const client = new Client({
    host: appOrigin(),
    auth: { bearer: () => secret },
    headers: { "x-on-behalf-of": userId },
  });

  const message = `[Live meeting request, answer briefly for speech] ${request}`;

  const started = sessionId
    ? (() => {
        const session = client.sessions.attach(sessionId);
        return session.send(message).then((response) => ({ id: session.state.sessionId, response }));
      })()
    : client.sessions.create({ message }).then(({ session, response }) => ({ id: session.state.sessionId, response }));

  const handle = await started;

  const reply = withTimeout(
    handle.response.result().then((result) => result.message?.trim() ?? ""),
    timeoutMs,
    "I'm still working on that. I'll post the result in the meeting chat.",
  );

  return { sessionId: handle.id, reply };
}

function withTimeout(promise: Promise<string>, ms: number, fallback: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => resolve(fallback), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}
