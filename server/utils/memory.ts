/**
 * Parses raw fileMemory document format to extract memory entries.
 * Format:
 * <!-- eve-memory-file-v1 lastAllocatedIndex=... -->
 * 0: fact one
 * 1: fact two
 */
export function parseMemoryEntriesFromDocument(content: string): string[] {
  if (!content) return [];
  const lines = content.split("\n");
  const entries: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("<!--") || !trimmed) continue;
    const match = trimmed.match(/^\d+:\s*(.+)$/);
    if (match?.[1]) {
      entries.push(match[1]);
    }
  }

  return entries;
}

/**
 * Attempts to read memory entries for a user using Eve's Vercel Blob backend
 * or local memory storage.
 */
export async function fetchUserMemoryEntries(userId: string): Promise<string[]> {
  try {
    const { vercelBlob } = await import("eve/memory/file/vercel");
    const backend = vercelBlob();
    const controller = new AbortController();
    const doc = await backend.read({ key: userId, signal: controller.signal });
    if (!doc || !doc.content) {
      return [];
    }
    return parseMemoryEntriesFromDocument(doc.content);
  }
  catch {
    return [];
  }
}
