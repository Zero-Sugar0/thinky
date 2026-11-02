import { Composio } from "@composio/core";

let composioClient: Composio | null = null;

type ComposioSessionBase = Awaited<ReturnType<Composio["create"]>>;
type ComposioSessionRequestOptions = { signal?: AbortSignal };
// The SDK implementation accepts request options for these methods, but its
// public Session interface currently omits them.
export type ComposioSession = ComposioSessionBase & {
  search: (
    params: Parameters<ComposioSessionBase["search"]>[0],
    requestOptions?: ComposioSessionRequestOptions,
  ) => ReturnType<ComposioSessionBase["search"]>;
  toolkits: (
    options?: Parameters<ComposioSessionBase["toolkits"]>[0],
    requestOptions?: ComposioSessionRequestOptions,
  ) => ReturnType<ComposioSessionBase["toolkits"]>;
  execute: (
    toolSlug: string,
    arguments_?: Record<string, unknown>,
    options?: Parameters<ComposioSessionBase["execute"]>[2],
    requestOptions?: ComposioSessionRequestOptions,
  ) => ReturnType<ComposioSessionBase["execute"]>;
};
const userSessions = new Map<string, ComposioSessionBase>();

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

export async function getOrCreateComposioSession(userId: string, signal?: AbortSignal): Promise<ComposioSession> {
  const composio = getAgentComposioClient();
  if (!composio) {
    throw new Error("COMPOSIO_API_KEY is not configured in the environment.");
  }

  const existing = userSessions.get(userId);
  if (existing) {
    return existing;
  }

  const session = await composio.create(userId, {}, { signal });
  userSessions.set(userId, session);
  return session;
}
