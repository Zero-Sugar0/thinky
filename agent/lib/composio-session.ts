import { Composio } from "@composio/core";

let composioClient: Composio | null = null;

export type ComposioSession = Awaited<ReturnType<Composio["create"]>>;
const userSessions = new Map<string, ComposioSession>();

export function getAgentComposioClient(): Composio | null {
  const apiKey = process.env.COMPOSIO_API_KEY;
  if (!apiKey) {
    return null;
  }
  if (!composioClient) {
    composioClient = new Composio({ apiKey });
  }
  return composioClient;
}

export function requireComposioUserId(userId: string | undefined): string {
  if (!userId?.trim()) {
    throw new Error("Cannot use Composio without an authenticated user identity.");
  }
  return userId;
}

export async function getOrCreateComposioSession(userId: string): Promise<ComposioSession> {
  const composio = getAgentComposioClient();
  if (!composio) {
    throw new Error("COMPOSIO_API_KEY is not configured in the environment.");
  }

  const existing = userSessions.get(userId);
  if (existing) {
    return existing;
  }

  const session = await composio.create(userId);
  userSessions.set(userId, session);
  return session;
}
