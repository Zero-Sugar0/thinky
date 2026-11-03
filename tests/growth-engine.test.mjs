import assert from "node:assert/strict";
import { test } from "node:test";
import {
  sanitizeMetaValue,
  searchGrowthCatalog,
  inspectGrowthEndpoint,
  callGrowthTool,
} from "../agent/lib/growth-engine.ts";

test("sanitizeMetaValue cleans customer tag values according to treg specs", () => {
  assert.equal(sanitizeMetaValue("user_123:workspace-9.alpha"), "user_123:workspace-9.alpha");
  assert.equal(sanitizeMetaValue("user@example.com #123"), "user_example.com__123");
  assert.equal(sanitizeMetaValue("a".repeat(200)).length, 128);
});

test("searchGrowthCatalog parses search response properly", async () => {
  const originalFetch = globalThis.fetch;
  let requestedUrl;

  globalThis.fetch = async (url) => {
    requestedUrl = new URL(url.toString());
    return new Response(
      JSON.stringify({
        results: [
          {
            id: "treg.people.email.find",
            name: "Find email address",
            provider: "treg",
            provider_display: "Treg Routed",
            summary: "Finds work email",
            kind: "routed",
            cost: { usd: 0.015, note: "per hit" },
          },
        ],
        hints: ["Prefer routed capabilities"],
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  };

  try {
    const result = await searchGrowthCatalog({ query: "find email", limit: 5 });
    assert.equal(result.query, "find email");
    assert.equal(result.total, 1);
    assert.equal(result.results[0].id, "treg.people.email.find");
    assert.equal(result.results[0].provider, "treg");
    assert.equal(result.results[0].provider_display, "Treg Routed");
    assert.equal(result.hints?.[0], "Prefer routed capabilities");
    assert.equal(requestedUrl?.searchParams.get("q"), "find email");
    assert.equal(requestedUrl?.searchParams.get("limit"), "5");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("inspectGrowthEndpoint returns endpoint schemas and pricing", async () => {
  const originalFetch = globalThis.fetch;
  let requestedUrl;

  globalThis.fetch = async (url) => {
    requestedUrl = new URL(url.toString());
    return new Response(
      JSON.stringify({
        endpoint: {
          id: "treg.people.email.find",
          name: "Find email",
          summary: "Find work email",
          cost: { usd: 0.015, type: "per_success" },
          input: { bodyType: "json" },
        },
        routing: { plan: [] },
        siblings: [{ id: "vendor.email.find", provider: "vendor" }],
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  };

  try {
    const result = await inspectGrowthEndpoint("treg.people.email.find");
    assert.equal(result.endpoint.id, "treg.people.email.find");
    assert.equal(result.endpoint.cost?.usd, 0.015);
    assert.equal(result.siblings?.length, 1);
    assert.ok(requestedUrl?.pathname.includes("treg.people.email.find"));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("callGrowthTool enforces TREG_TOKEN presence", async () => {
  const prevToken = process.env.TREG_TOKEN;
  delete process.env.TREG_TOKEN;

  try {
    await assert.rejects(
      callGrowthTool({ toolId: "treg.people.email.find" }),
      /TREG_TOKEN environment variable is missing/,
    );
  } finally {
    if (prevToken !== undefined) process.env.TREG_TOKEN = prevToken;
  }
});

test("callGrowthTool passes customer meta, ceiling headers, and extracts costMicro & callId", async () => {
  const prevToken = process.env.TREG_TOKEN;
  process.env.TREG_TOKEN = "test-token";
  const originalFetch = globalThis.fetch;
  let capturedHeaders;
  let capturedBody;

  globalThis.fetch = async (_url, init) => {
    capturedHeaders = new Headers(init?.headers);
    capturedBody = init?.body;
    return new Response(JSON.stringify({ output: { email: "satya@microsoft.com" } }), {
      status: 200,
      headers: {
        "content-type": "application/json",
        "x-treg-cost-micro": "15000",
        "x-treg-call-id": "call_12345",
        "x-treg-served-by": "hunter",
        "x-treg-domain-match": "true",
      },
    });
  };

  try {
    const result = await callGrowthTool({
      toolId: "treg.people.email.find",
      data: { first_name: "Satya", last_name: "Nadella", domain: "microsoft.com" },
      customerId: "cust_abc-123",
      maxCostUsd: 0.5,
      idempotencyKey: "idem_key_xyz",
    });

    assert.equal(result.success, true);
    assert.equal(result.httpStatus, 200);
    assert.equal(result.costMicro, 15000);
    assert.equal(result.costUsd, 0.015);
    assert.equal(result.callId, "call_12345");
    assert.equal(result.servedBy, "hunter");
    assert.equal(result.domainMatch, true);

    assert.equal(capturedHeaders?.get("x-treg-token"), "test-token");
    assert.equal(capturedHeaders?.get("x-treg-meta"), "customer=cust_abc-123");
    assert.equal(capturedHeaders?.get("x-treg-route-max-cost"), "0.5000");
    assert.equal(capturedHeaders?.get("idempotency-key"), "idem_key_xyz");
    assert.deepEqual(JSON.parse(capturedBody || "{}"), {
      first_name: "Satya",
      last_name: "Nadella",
      domain: "microsoft.com",
    });
  } finally {
    globalThis.fetch = originalFetch;
    if (prevToken === undefined) delete process.env.TREG_TOKEN;
    else process.env.TREG_TOKEN = prevToken;
  }
});
