import { defineTool } from "eve/tools";
import { z } from "zod";

const BASE = process.env.CAMOFOX_BASE_URL;
const API_KEY = process.env.CAMOFOX_API_KEY;
const USER_ID = process.env.CAMOFOX_USER_ID || "eve-agent";

if (!BASE) {
  throw new Error("CAMOFOX_BASE_URL environment variable is required");
}

async function camofoxFetch(path: string, options: RequestInit = {}) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(API_KEY ? { Authorization: `Bearer ${API_KEY}` } : {}),
    ...(options.headers as Record<string, string>),
  };

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Camofox error ${res.status}: ${text}`);
  }

  // Some endpoints return empty body
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return res.json();
  }
  return { ok: true };
}

// ============================================
// 1. Open a new tab
// ============================================
export const camofox_open = defineTool({
  description:
    "Open a new browser tab using Camoufox (anti-detection browser). Use this for any website, especially sites with Cloudflare, bot protection, Google, LinkedIn, Amazon, Uber, DoorDash, etc.",
  inputSchema: z.object({
    url: z.string().url().describe("Full URL to open"),
    sessionKey: z
      .string()
      .optional()
      .default("main")
      .describe("Group related tabs under the same session"),
  }),
  outputSchema: z.object({
    tabId: z.string(),
    url: z.string(),
    title: z.string().optional(),
  }),
  async execute({ url, sessionKey }) {
    const data = await camofoxFetch("/tabs", {
      method: "POST",
      body: JSON.stringify({
        userId: USER_ID,
        sessionKey: sessionKey || "main",
        url,
      }),
    });

    return {
      tabId: data.tabId,
      url: data.url,
      title: data.title,
    };
  },
});

// ============================================
// 2. Take accessibility snapshot (MOST IMPORTANT)
// ============================================
export const camofox_snapshot = defineTool({
  description:
    "Get a clean accessibility snapshot of the current page with stable element refs (e1, e2, e3...). This is the primary way to see the page. Always call this after opening a page or after any important action (click, type, navigate).",
  inputSchema: z.object({
    tabId: z.string().describe("Tab ID from camofox_open"),
    offset: z
      .number()
      .optional()
      .describe("Use this if previous snapshot was truncated (hasMore)"),
  }),
  outputSchema: z.object({
    url: z.string(),
    snapshot: z.string(),
    refsCount: z.number().optional(),
    truncated: z.boolean().optional(),
  }),
  async execute({ tabId, offset }) {
    const params = new URLSearchParams({ userId: USER_ID });
    if (offset != null) params.set("offset", String(offset));

    const data = await camofoxFetch(`/tabs/${tabId}/snapshot?${params}`);

    return {
      url: data.url,
      snapshot: data.snapshot,
      refsCount: data.refsCount,
      truncated: data.truncated || false,
    };
  },
});

// ============================================
// 3. Click an element
// ============================================
export const camofox_click = defineTool({
  description:
    "Click an element on the page. Always prefer using the element ref from the snapshot (e1, e2, etc.). Only use CSS selector if no ref is available.",
  inputSchema: z.object({
    tabId: z.string(),
    ref: z.string().optional().describe("Element ref from snapshot, e.g. e1"),
    selector: z.string().optional().describe("CSS selector (fallback only)"),
  }),
  outputSchema: z.object({
    ok: z.boolean(),
    url: z.string().optional(),
  }),
  async execute({ tabId, ref, selector }) {
    if (!ref && !selector) {
      throw new Error("You must provide either ref or selector");
    }

    const data = await camofoxFetch(`/tabs/${tabId}/click`, {
      method: "POST",
      body: JSON.stringify({
        userId: USER_ID,
        ref,
        selector,
      }),
    });

    return {
      ok: data.ok ?? true,
      url: data.url,
    };
  },
});

// ============================================
// 4. Type text into an element
// ============================================
export const camofox_type = defineTool({
  description:
    "Type text into an input, textarea, or contenteditable element. Prefer using the element ref from the snapshot.",
  inputSchema: z.object({
    tabId: z.string(),
    text: z.string().describe("Text to type"),
    ref: z.string().optional().describe("Element ref from snapshot"),
    selector: z.string().optional().describe("CSS selector (fallback)"),
    pressEnter: z
      .boolean()
      .optional()
      .describe("Press Enter after typing (useful for search boxes)"),
  }),
  outputSchema: z.object({
    ok: z.boolean(),
  }),
  async execute({ tabId, text, ref, selector, pressEnter }) {
    if (!ref && !selector) {
      throw new Error("You must provide either ref or selector");
    }

    const data = await camofoxFetch(`/tabs/${tabId}/type`, {
      method: "POST",
      body: JSON.stringify({
        userId: USER_ID,
        text,
        ref,
        selector,
        pressEnter,
      }),
    });

    return { ok: data.ok ?? true };
  },
});

// ============================================
// 5. Navigate or use search macros
// ============================================
export const camofox_navigate = defineTool({
  description:
    "Navigate the current tab to a new URL, or use a search macro. Supported macros: @google_search, @youtube_search, @amazon_search, @reddit_search, @linkedin_search, @twitter_search, @wikipedia_search, etc.",
  inputSchema: z.object({
    tabId: z.string(),
    url: z.string().url().optional().describe("Full URL to navigate to"),
    macro: z
      .string()
      .optional()
      .describe("Search macro, e.g. @google_search"),
    query: z.string().optional().describe("Search query when using a macro"),
  }),
  outputSchema: z.object({
    ok: z.boolean(),
    url: z.string().optional(),
  }),
  async execute({ tabId, url, macro, query }) {
    if (!url && !macro) {
      throw new Error("Provide either url or macro");
    }

    const data = await camofoxFetch(`/tabs/${tabId}/navigate`, {
      method: "POST",
      body: JSON.stringify({
        userId: USER_ID,
        url,
        macro,
        query,
      }),
    });

    return {
      ok: data.ok ?? true,
      url: data.url,
    };
  },
});

// ============================================
// 6. Scroll the page
// ============================================
export const camofox_scroll = defineTool({
  description: "Scroll the page up, down, left, or right.",
  inputSchema: z.object({
    tabId: z.string(),
    direction: z.enum(["up", "down", "left", "right"]),
    amount: z
      .number()
      .optional()
      .default(600)
      .describe("Pixels to scroll (default 600)"),
  }),
  outputSchema: z.object({
    ok: z.boolean(),
  }),
  async execute({ tabId, direction, amount }) {
    const data = await camofoxFetch(`/tabs/${tabId}/scroll`, {
      method: "POST",
      body: JSON.stringify({
        userId: USER_ID,
        direction,
        amount: amount || 600,
      }),
    });

    return { ok: data.ok ?? true };
  },
});

// ============================================
// 7. List open tabs
// ============================================
export const camofox_list_tabs = defineTool({
  description: "List all currently open browser tabs for this agent.",
  inputSchema: z.object({}),
  outputSchema: z.object({
    tabs: z.array(
      z.object({
        tabId: z.string(),
        url: z.string(),
        title: z.string().optional(),
      })
    ),
  }),
  async execute() {
    const data = await camofoxFetch(`/tabs?userId=${USER_ID}`);
    return {
      tabs: (data.tabs || []).map((t: any) => ({
        tabId: t.tabId,
        url: t.url,
        title: t.title,
      })),
    };
  },
});

// ============================================
// 8. Close a tab
// ============================================
export const camofox_close = defineTool({
  description: "Close a browser tab when you are finished with it.",
  inputSchema: z.object({
    tabId: z.string(),
  }),
  outputSchema: z.object({
    ok: z.boolean(),
  }),
  async execute({ tabId }) {
    await camofoxFetch(`/tabs/${tabId}?userId=${USER_ID}`, {
      method: "DELETE",
    });
    return { ok: true };
  },
});

// ============================================
// 9. Take a screenshot (visual fallback)
// ============================================
export const camofox_screenshot = defineTool({
  description:
    "Take a visual screenshot of the current page. Prefer camofox_snapshot for understanding the page. Use this only when you need a visual confirmation.",
  inputSchema: z.object({
    tabId: z.string(),
  }),
  outputSchema: z.object({
    ok: z.boolean(),
    message: z.string(),
  }),
  async execute({ tabId }) {
    // Returns image data - for now we just confirm it worked
    // (Eve can handle image responses if needed later)
    const res = await fetch(
      `${BASE}/tabs/${tabId}/screenshot?userId=${USER_ID}`,
      {
        headers: API_KEY ? { Authorization: `Bearer ${API_KEY}` } : {},
      }
    );

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Screenshot failed: ${res.status} ${text}`);
    }

    return {
      ok: true,
      message: "Screenshot captured successfully",
    };
  },
});