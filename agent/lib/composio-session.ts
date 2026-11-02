import { Composio } from "@composio/core";

let composioClient: Composio | null = null;

type ComposioSessionBase = Awaited<ReturnType<Composio["create"]>>;
type ComposioSessionRequestOptions = { signal?: AbortSignal };
type ComposioConnectedAccount = Awaited<
  ReturnType<Composio["connectedAccounts"]["list"]>
>["items"][number];
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

export type ActiveComposioAccount = Pick<
  ComposioConnectedAccount,
  "id" | "toolkit" | "updatedAt"
>;

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

export async function listActiveComposioAccounts(
  userId: string,
  signal?: AbortSignal,
): Promise<ActiveComposioAccount[]> {
  const composio = getAgentComposioClient();
  if (!composio) {
    throw new Error("COMPOSIO_API_KEY is not configured in the environment.");
  }

  const accounts: ActiveComposioAccount[] = [];
  const seenCursors = new Set<string>();
  let cursor: string | undefined;

  do {
    const page = await composio.connectedAccounts.list({
      userIds: [userId],
      statuses: ["ACTIVE"],
      orderBy: "updated_at",
      limit: 100,
      cursor,
    }, { signal });

    for (const account of page.items) {
      if (account.status === "ACTIVE" && !account.isDisabled && account.toolkit?.slug) {
        accounts.push({
          id: account.id,
          toolkit: account.toolkit,
          updatedAt: account.updatedAt,
        });
      }
    }

    const nextCursor = page.nextCursor ?? undefined;
    if (nextCursor && seenCursors.has(nextCursor)) {
      throw new Error("Composio returned a repeated connected-account cursor.");
    }
    if (nextCursor) {
      seenCursors.add(nextCursor);
    }
    cursor = nextCursor;
  } while (cursor);

  return accounts;
}

export function findComposioAccountForTool(
  toolSlug: string,
  accounts: ActiveComposioAccount[],
): ActiveComposioAccount | undefined {
  const normalizedToolSlug = toolSlug.toLowerCase();
  return accounts
    .filter(({ toolkit }) => normalizedToolSlug.startsWith(`${toolkit.slug.toLowerCase()}_`))
    .sort((left, right) => right.toolkit.slug.length - left.toolkit.slug.length)[0];
}

export async function createComposioSession(
  userId: string,
  signal?: AbortSignal,
  connectedAccounts?: Record<string, string | string[]>,
): Promise<ComposioSession> {
  const composio = getAgentComposioClient();
  if (!composio) {
    throw new Error("COMPOSIO_API_KEY is not configured in the environment.");
  }

  return composio.create(
    userId,
    connectedAccounts ? { connectedAccounts } : {},
    { signal },
  );
}
