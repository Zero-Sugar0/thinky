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
 * Public endpoint, does not strictly require auth, but uses it if configured.
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
 * Execute a tool via Growth Engine (Treg).
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

  const method = (options.method || (options.data ? "POST" : "GET")).toUpperCase();
  let bodyPayload: string | undefined;

  if (options.data && method !== "GET") {
    headers["Content-Type"] = "application/json";
    bodyPayload = JSON.stringify(options.data);
  }

  const response = await fetch(url.toString(), {
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

  let responseBody: unknown;
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    responseBody = await response.json().catch(() => null);
  } else {
    responseBody = await response.text().catch(() => null);
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
    data: responseBody,
  };
}
