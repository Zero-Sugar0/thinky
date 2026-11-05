/**
 * Growth Engine Client
 *
 * Provides agent tools access to 4,100+ endpoints across 123+ providers
 * for lead generation, SEO & SERPs, enrichment, social signals, and data extraction.
 * Powered by treg (https://treg.to) under the hood.
 */

const TREG_BASE_URL = process.env.TREG_BASE_URL || "https://treg.to";

export interface GrowthSearchFilter {
  query: string;
  limit?: number;
  sort?: "newest" | "relevance";
  addedWithinDays?: number;
}

export interface GrowthCatalogEndpoint {
  id: string;
  name?: string;
  provider?: string;
  provider_display?: string;
  summary?: string;
  domain?: string;
  platform?: string;
  platform_label?: string;
  kind?: string;
  method?: string;
  path?: string;
  cost?: {
    type?: string;
    usd?: number;
    value?: number;
    unit?: string;
    currency?: string;
    note?: string;
  };
  score?: number;
  call_template?: string;
  input?: Record<string, unknown>;
  routed_children?: string[];
  observed?: {
    ok_rate?: number | null;
    p50_ms?: number | null;
    samples?: number;
  };
}

export interface GrowthSearchResult {
  query: string;
  total: number;
  results: GrowthCatalogEndpoint[];
  hints?: string[];
}

export interface GrowthInspectResult {
  endpoint: GrowthCatalogEndpoint;
  routing?: Record<string, unknown>;
  siblings?: GrowthCatalogEndpoint[];
  relatedCapabilities?: Array<{ endpoint_id: string; capability: string; does: string }>;
  callTemplate?: string;
  hints?: string[];
}

export interface GrowthCallOptions {
  toolId: string;
  method?: "GET" | "POST" | "PUT" | "DELETE";
  query?: Record<string, string | number | boolean | undefined>;
  data?: Record<string, unknown>;
  maxCostUsd?: number;
  customerId?: string;
  idempotencyKey?: string;
  awaitAsync?: boolean;
  asyncTimeoutSeconds?: number;
  stopOnFirstMiss?: boolean;
  strictFilters?: boolean;
  noCache?: boolean;
  extraHeaders?: Record<string, string>;
  signal?: AbortSignal;
}

export interface GrowthCallResult {
  toolId: string;
  success: boolean;
  httpStatus: number;
  servedBy?: string;
  costMicro?: number;
  costUsd?: number;
  callId?: string;
  data: unknown;
  cached?: boolean;
  domainMatch?: boolean;
  replayed?: boolean;
  advice?: string;
  ignoredFilters?: string[];
  asyncDescriptor?: unknown;
  error?: string;
}

/**
 * Normalizes customer tag for X-Treg-Meta header.
 * Allowed characters: letters, digits, and . _ - :
 */
export function sanitizeMetaValue(val: string): string {
  return val.replace(/[^a-zA-Z0-9._:-]/g, "_").slice(0, 128);
}

/**
 * Search the Growth Engine tool catalog (SEO, Leads, Enrichment, Social, etc.).
 */
export async function searchGrowthCatalog(
  filters: GrowthSearchFilter,
  signal?: AbortSignal,
): Promise<GrowthSearchResult> {
  const url = new URL("/catalog/search", TREG_BASE_URL);
  url.searchParams.set("q", filters.query);
  if (filters.limit) {
    url.searchParams.set("limit", String(Math.min(filters.limit, 100)));
  }
  if (filters.sort) {
    url.searchParams.set("sort", filters.sort);
  }
  if (filters.addedWithinDays) {
    url.searchParams.set("days", String(filters.addedWithinDays));
  }

  const token = process.env.TREG_TOKEN;
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (token) {
    headers["X-Treg-Token"] = token;
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers,
    signal,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(
      `Growth catalog search failed (${response.status}): ${errorText || response.statusText}`,
    );
  }

  const body = (await response.json()) as {
    results?: GrowthCatalogEndpoint[];
    hits?: GrowthCatalogEndpoint[];
    hints?: string[];
  };

  const list = body.results || body.hits || [];
  return {
    query: filters.query,
    total: list.length,
    results: list,
    hints: body.hints,
  };
}

/**
 * Inspect a specific tool or endpoint in detail (inputs, cost, schema, routing plan).
 */
export async function inspectGrowthEndpoint(
  toolId: string,
  signal?: AbortSignal,
): Promise<GrowthInspectResult> {
  const cleanId = encodeURIComponent(toolId.trim());
  const url = new URL(`/catalog/endpoints/${cleanId}`, TREG_BASE_URL);

  const token = process.env.TREG_TOKEN;
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (token) {
    headers["X-Treg-Token"] = token;
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers,
    signal,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(
      `Failed to inspect endpoint '${toolId}' (${response.status}): ${errorText || response.statusText}`,
    );
  }

  const body = (await response.json()) as {
    endpoint?: GrowthCatalogEndpoint;
    routing?: Record<string, unknown>;
    siblings?: GrowthCatalogEndpoint[];
    related_capabilities?: Array<{ endpoint_id: string; capability: string; does: string }>;
    call_template?: string;
    hints?: string[];
    [key: string]: unknown;
  };

  const endpoint = body.endpoint || (body as unknown as GrowthCatalogEndpoint);
  return {
    endpoint,
    routing: body.routing,
    siblings: body.siblings,
    relatedCapabilities: body.related_capabilities,
    callTemplate: body.call_template,
    hints: body.hints,
  };
}

/**
 * Helper to parse async descriptor from X-Treg-Async header or body.
 */
interface AsyncDescriptor {
  poll_url?: string;
  poll_path?: string;
  status_path?: string;
  final_statuses?: string[];
  ttl_note?: string;
  [key: string]: unknown;
}

/**
 * Execute a tool via Growth Engine (Treg) with optional async task polling.
 */
export async function callGrowthTool(
  options: GrowthCallOptions,
): Promise<GrowthCallResult> {
  const token = process.env.TREG_TOKEN;
  if (!token) {
    throw new Error(
      "Growth Engine is not configured: TREG_TOKEN environment variable is missing.",
    );
  }

  const toolId = options.toolId.trim();
  const path = toolId.startsWith("/") ? toolId.slice(1) : toolId;
  const url = new URL(`/call/${path}`, TREG_BASE_URL);

  if (options.query) {
    for (const [key, val] of Object.entries(options.query)) {
      if (val !== undefined && val !== null) {
        url.searchParams.set(key, String(val));
      }
    }
  }

  const headers: Record<string, string> = {
    "X-Treg-Token": token,
    Accept: "application/json",
    ...options.extraHeaders,
  };

  if (options.customerId) {
    headers["X-Treg-Meta"] = `customer=${sanitizeMetaValue(options.customerId)}`;
  }

  if (options.maxCostUsd !== undefined && options.maxCostUsd > 0) {
    headers["X-Treg-Route-Max-Cost"] = options.maxCostUsd.toFixed(4);
  }

  if (options.idempotencyKey) {
    headers["Idempotency-Key"] = options.idempotencyKey;
  }

  if (options.stopOnFirstMiss) {
    headers["X-Treg-Route-Waterfall"] = "0";
  }

  if (options.strictFilters) {
    headers["X-Treg-Route-Strict-Filters"] = "1";
  }

  if (options.noCache) {
    headers["Cache-Control"] = "no-cache";
  }

  const method = (options.method || (options.data ? "POST" : "GET")).toUpperCase();
  let bodyPayload: string | undefined;

  if (options.data && method !== "GET") {
    headers["Content-Type"] = "application/json";
    bodyPayload = JSON.stringify(options.data);
  }

  let response = await fetch(url.toString(), {
    method,
    headers,
    body: bodyPayload,
    signal: options.signal,
  });

  const costMicroStr = response.headers.get("X-Treg-Cost-Micro");
  const costMicro = costMicroStr ? parseInt(costMicroStr, 10) : undefined;
  const costUsd = costMicro !== undefined ? costMicro / 1_000_000 : undefined;
  const callId = response.headers.get("X-Treg-Call-Id") || undefined;
  const servedBy = response.headers.get("X-Treg-Served-By") || undefined;
  const cached = response.headers.get("X-Treg-Cache") === "hit";
  const domainMatch = response.headers.has("X-Treg-Domain-Match")
    ? response.headers.get("X-Treg-Domain-Match") === "true"
    : undefined;
  const replayed = response.headers.get("X-Treg-Idempotent-Replay") === "true";

  let ignoredFilters: string[] | undefined;
  const ignoredHeader = response.headers.get("X-Treg-Ignored-Filters");
  if (ignoredHeader) {
    ignoredFilters = ignoredHeader.split(",").map((s) => s.trim()).filter(Boolean);
  }

  let responseBody: unknown;
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    responseBody = await response.json().catch(() => null);
  } else {
    responseBody = await response.text().catch(() => null);
  }

  let advice: string | undefined;
  if (responseBody && typeof responseBody === "object") {
    const bodyObj = responseBody as Record<string, unknown>;
    const tregBlock = (bodyObj._treg as Record<string, unknown>) || undefined;
    if (tregBlock) {
      if (typeof tregBlock.advice === "string") {
        advice = tregBlock.advice;
      }
      if (!ignoredFilters && Array.isArray(tregBlock.ignored_filters)) {
        ignoredFilters = tregBlock.ignored_filters.map(String);
      }
    }
  }

  // Handle async task polling (e.g. video-gen, image-gen, or async provider returning 202)
  const asyncHeader = response.headers.get("X-Treg-Async");
  let asyncDescriptor: AsyncDescriptor | undefined;
  if (asyncHeader) {
    try {
      asyncDescriptor = JSON.parse(asyncHeader) as AsyncDescriptor;
    } catch {
      // ignore JSON parse error in header
    }
  }

  if (options.awaitAsync && (response.status === 202 || asyncDescriptor)) {
    const pollPath = asyncDescriptor?.poll_url || asyncDescriptor?.poll_path;
    const finalStatuses = asyncDescriptor?.final_statuses || ["succeeded", "completed", "failed", "success", "error"];
    const timeoutSeconds = options.asyncTimeoutSeconds || 180;
    const startTime = Date.now();

    if (pollPath) {
      let isDone = false;
      while (!isDone && (Date.now() - startTime) < timeoutSeconds * 1000) {
        if (options.signal?.aborted) {
          throw new DOMException("Aborted", "AbortError");
        }

        await new Promise((resolve) => setTimeout(resolve, 3000));

        const pollUrl = pollPath.startsWith("http")
          ? pollPath
          : new URL(pollPath, TREG_BASE_URL).toString();

        const pollRes = await fetch(pollUrl, {
          method: "GET",
          headers: {
            "X-Treg-Token": token,
            Accept: "application/json",
          },
          signal: options.signal,
        });

        if (pollRes.ok) {
          const pollData = (await pollRes.json().catch(() => null)) as Record<string, unknown> | null;
          const currentStatus = String(
            pollData?.status || pollData?.state || (pollData?.output as Record<string, unknown>)?.status || "",
          ).toLowerCase();

          if (finalStatuses.includes(currentStatus) || pollRes.status === 200) {
            response = pollRes;
            responseBody = pollData;
            isDone = true;
          }
        }
      }
    }
  }

  if (!response.ok) {
    const isTregError = response.headers.get("X-Treg-Error") === "1";
    let errorMessage: string;
    if (typeof responseBody === "object" && responseBody !== null) {
      const errObj = responseBody as Record<string, unknown>;
      errorMessage = (errObj.message || errObj.error || errObj.detail || JSON.stringify(responseBody)) as string;
    } else {
      errorMessage = String(responseBody || response.statusText);
    }

    return {
      toolId,
      success: false,
      httpStatus: response.status,
      servedBy,
      costMicro,
      costUsd,
      callId,
      cached,
      replayed,
      domainMatch,
      advice,
      ignoredFilters,
      asyncDescriptor,
      data: responseBody,
      error: `[${isTregError ? "GrowthEngine" : "Provider"} ${response.status}] ${errorMessage}`,
    };
  }

  return {
    toolId,
    success: true,
    httpStatus: response.status,
    servedBy,
    costMicro,
    costUsd,
    callId,
    cached,
    replayed,
    domainMatch,
    advice,
    ignoredFilters,
    asyncDescriptor,
    data: responseBody,
  };
}

/**
 * Submit feedback or report missing capabilities / catalog requests to Treg.
 */
export async function submitGrowthFeedback(params: {
  category: "quality" | "pricing" | "friction" | "other";
  message: string;
  endpointId?: string;
  callIds?: string[];
  signal?: AbortSignal;
}): Promise<{ success: boolean; feedbackId?: string; error?: string }> {
  const token = process.env.TREG_TOKEN;
  if (!token) {
    throw new Error("TREG_TOKEN environment variable is missing.");
  }

  const url = new URL("/feedback", TREG_BASE_URL);
  const response = await fetch(url.toString(), {
    method: "POST",
    headers: {
      "X-Treg-Token": token,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      category: params.category,
      message: params.message,
      endpoint_id: params.endpointId,
      call_ids: params.callIds,
    }),
    signal: params.signal,
  });

  const body = (await response.json().catch(() => null)) as {
    feedback_id?: string;
    error?: string;
    message?: string;
  } | null;

  if (!response.ok) {
    return {
      success: false,
      error: body?.message || body?.error || `Feedback submission failed (${response.status})`,
    };
  }

  return {
    success: true,
    feedbackId: body?.feedback_id,
  };
}

/**
 * Submit a review/rating for a specific call by its Call ID.
 * Usefulness: 'useful' | 'partly' | 'not_useful' | 'not_sure'.
 */
export async function submitGrowthReview(params: {
  callId: string;
  usefulness: "useful" | "partly" | "not_useful" | "not_sure";
  reason?: string;
  signal?: AbortSignal;
}): Promise<{ success: boolean; reviewId?: string; error?: string }> {
  const token = process.env.TREG_TOKEN;
  if (!token) {
    throw new Error("TREG_TOKEN environment variable is missing.");
  }

  const cleanCallId = encodeURIComponent(params.callId.trim());
  const url = new URL(`/calls/${cleanCallId}/review`, TREG_BASE_URL);

  const response = await fetch(url.toString(), {
    method: "POST",
    headers: {
      "X-Treg-Token": token,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      usefulness: params.usefulness,
      reason: params.reason,
    }),
    signal: params.signal,
  });

  const body = (await response.json().catch(() => null)) as {
    review_id?: string;
    error?: string;
    message?: string;
  } | null;

  if (!response.ok) {
    return {
      success: false,
      error: body?.message || body?.error || `Call review submission failed (${response.status})`,
    };
  }

  return {
    success: true,
    reviewId: body?.review_id,
  };
}

/**
 * Recover the stored result of a previous successful catalog call by Call ID.
 * Avoids re-calling or re-paying for lost results.
 */
export async function getGrowthCallResult(
  callId: string,
  signal?: AbortSignal,
): Promise<{
  success: boolean;
  callId: string;
  data?: unknown;
  costMicro?: number;
  costUsd?: number;
  error?: string;
}> {
  const token = process.env.TREG_TOKEN;
  if (!token) {
    throw new Error("TREG_TOKEN environment variable is missing.");
  }

  const cleanCallId = encodeURIComponent(callId.trim());
  const url = new URL(`/calls/${cleanCallId}/result`, TREG_BASE_URL);

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      "X-Treg-Token": token,
      Accept: "application/json",
    },
    signal,
  });

  const costMicroStr = response.headers.get("X-Treg-Cost-Micro");
  const costMicro = costMicroStr ? parseInt(costMicroStr, 10) : undefined;
  const costUsd = costMicro !== undefined ? costMicro / 1_000_000 : undefined;

  let body: unknown;
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    body = await response.json().catch(() => null);
  } else {
    body = await response.text().catch(() => null);
  }

  if (!response.ok) {
    const errorMsg =
      typeof body === "object" && body !== null
        ? (body as Record<string, unknown>).message || (body as Record<string, unknown>).error
        : body;
    return {
      success: false,
      callId,
      error: String(errorMsg || `Failed to retrieve call result (${response.status})`),
    };
  }

  return {
    success: true,
    callId,
    costMicro,
    costUsd,
    data: body,
  };
}

/**
 * Get account balance and recent activity.
 */
export async function getGrowthBalance(signal?: AbortSignal): Promise<{
  success: boolean;
  balanceUsd?: number;
  balanceMicro?: number;
  data?: unknown;
  error?: string;
}> {
  const token = process.env.TREG_TOKEN;
  if (!token) {
    throw new Error("TREG_TOKEN environment variable is missing.");
  }

  const url = new URL("/balance", TREG_BASE_URL);
  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      "X-Treg-Token": token,
      Accept: "application/json",
    },
    signal,
  });

  const body = (await response.json().catch(() => null)) as {
    balance_micro?: number;
    balance_usd?: number;
    [key: string]: unknown;
  } | null;

  if (!response.ok) {
    return {
      success: false,
      error: `Failed to fetch balance (${response.status})`,
    };
  }

  const balanceMicro = body?.balance_micro;
  const balanceUsd = body?.balance_usd ?? (balanceMicro !== undefined ? balanceMicro / 1_000_000 : undefined);

  return {
    success: true,
    balanceMicro,
    balanceUsd,
    data: body,
  };
}
