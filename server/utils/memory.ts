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
 * Attempts to read memory entries for a user from Vercel Blob or local storage.
 */
export async function fetchUserMemoryEntries(userId: string): Promise<string[]> {
  try {
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) return [];

    // The key format for byPrincipal is the principalId (userId)
    const blobPath = `eve/memory/file/${encodeURIComponent(userId)}/MEMORY.md`;
    const res = await fetch(`https://blob.vercel-storage.com/${blobPath}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      return [];
    }

    const text = await res.text();
    return parseMemoryEntriesFromDocument(text);
  }
  catch {
    return [];
  }
}
