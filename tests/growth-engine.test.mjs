import assert from "node:assert/strict";
import { test } from "node:test";
import {
  sanitizeMetaValue,
  searchGrowthCatalog,
  inspectGrowthEndpoint,
  callGrowthTool,
  submitGrowthFeedback,
  submitGrowthReview,
  getGrowthCallResult,
  getGrowthBalance,
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

test("callGrowthTool passes waterfall, strictFilters, noCache headers and parses advice and ignoredFilters", async () => {
  const prevToken = process.env.TREG_TOKEN;
  process.env.TREG_TOKEN = "test-token";
  const originalFetch = globalThis.fetch;
  let capturedHeaders;

  globalThis.fetch = async (_url, init) => {
    capturedHeaders = new Headers(init?.headers);
    return new Response(
      JSON.stringify({
        output: { phone: "+14155552671" },
        _treg: {
          advice: "Verify phone line before dialling",
          ignored_filters: ["min_followers"],
        },
      }),
      {
        status: 200,
        headers: {
          "content-type": "application/json",
          "x-treg-cost-micro": "20000",
          "x-treg-call-id": "call_phone_123",
          "x-treg-served-by": "dataprovider",
          "x-treg-ignored-filters": "min_followers, geo_country",
        },
      },
    );
  };

  try {
    const result = await callGrowthTool({
      toolId: "treg.people.phone.find",
      stopOnFirstMiss: true,
      strictFilters: true,
      noCache: true,
    });

    assert.equal(result.success, true);
    assert.equal(capturedHeaders.get("x-treg-route-waterfall"), "0");
    assert.equal(capturedHeaders.get("x-treg-route-strict-filters"), "1");
    assert.equal(capturedHeaders.get("cache-control"), "no-cache");
    assert.equal(result.advice, "Verify phone line before dialling");
    assert.deepEqual(result.ignoredFilters, ["min_followers", "geo_country"]);
  } finally {
    globalThis.fetch = originalFetch;
    if (prevToken === undefined) delete process.env.TREG_TOKEN;
    else process.env.TREG_TOKEN = prevToken;
  }
});

test("submitGrowthReview submits call review to /calls/:callId/review", async () => {
  const prevToken = process.env.TREG_TOKEN;
  process.env.TREG_TOKEN = "test-token";
  const originalFetch = globalThis.fetch;
  let capturedUrl;
  let capturedBody;

  globalThis.fetch = async (url, init) => {
    capturedUrl = new URL(url.toString());
    capturedBody = JSON.parse(init?.body || "{}");
    return new Response(JSON.stringify({ review_id: "rev_456" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };

  try {
    const res = await submitGrowthReview({
      callId: "call_abc_123",
      usefulness: "useful",
      reason: "Accurate phone number returned",
    });

    assert.equal(res.success, true);
    assert.equal(res.reviewId, "rev_456");
    assert.ok(capturedUrl?.pathname.includes("/calls/call_abc_123/review"));
    assert.equal(capturedBody.usefulness, "useful");
    assert.equal(capturedBody.reason, "Accurate phone number returned");
  } finally {
    globalThis.fetch = originalFetch;
    if (prevToken === undefined) delete process.env.TREG_TOKEN;
    else process.env.TREG_TOKEN = prevToken;
  }
});

test("getGrowthCallResult fetches stored call result without re-calling", async () => {
  const prevToken = process.env.TREG_TOKEN;
  process.env.TREG_TOKEN = "test-token";
  const originalFetch = globalThis.fetch;
  let capturedUrl;

  globalThis.fetch = async (url) => {
    capturedUrl = new URL(url.toString());
    return new Response(JSON.stringify({ recovered: "data_payload" }), {
      status: 200,
      headers: {
        "content-type": "application/json",
        "x-treg-cost-micro": "10000",
      },
    });
  };

  try {
    const res = await getGrowthCallResult("call_previous_xyz");
    assert.equal(res.success, true);
    assert.equal(res.callId, "call_previous_xyz");
    assert.deepEqual(res.data, { recovered: "data_payload" });
    assert.equal(res.costUsd, 0.01);
    assert.ok(capturedUrl?.pathname.includes("/calls/call_previous_xyz/result"));
  } finally {
    globalThis.fetch = originalFetch;
    if (prevToken === undefined) delete process.env.TREG_TOKEN;
    else process.env.TREG_TOKEN = prevToken;
  }
});

test("callGrowthTool executes custom routed endpoint calls", async () => {
  const prevToken = process.env.TREG_TOKEN;
  process.env.TREG_TOKEN = "test-token";
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (url) => {
    const urlStr = url.toString();
    if (urlStr.includes("treg.web.extract")) {
      return new Response(
        JSON.stringify({
          output: {
            title: "Sample Page",
            markdown: "# Sample Content",
            description: "Sample description",
          },
        }),
        { status: 200, headers: { "content-type": "application/json", "x-treg-cost-micro": "5000" } },
      );
    }
    if (urlStr.includes("treg.companies.similar")) {
      return new Response(
        JSON.stringify({
          output: {
            companies: [
              { domain: "rival.io", name: "Rival Corp", score: 0.92, summary: "Competitor" },
            ],
          },
        }),
        { status: 200, headers: { "content-type": "application/json", "x-treg-cost-micro": "8000" } },
      );
    }
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "content-type": "application/json" } });
  };

  try {
    const extractRes = await callGrowthTool({
      toolId: "treg.web.extract",
      data: { url: "https://example.com" },
      stopOnFirstMiss: true,
      strictFilters: true,
    });
    assert.equal(extractRes.success, true);
    assert.equal(extractRes.costUsd, 0.005);

    const similarRes = await callGrowthTool({
      toolId: "treg.companies.similar",
      data: { domain: "example.com" },
    });
    assert.equal(similarRes.success, true);
    assert.equal(similarRes.costUsd, 0.008);
  } finally {
    globalThis.fetch = originalFetch;
    if (prevToken === undefined) delete process.env.TREG_TOKEN;
    else process.env.TREG_TOKEN = prevToken;
  }
});

test("callGrowthTool handles async task polling with awaitAsync", async () => {
  const prevToken = process.env.TREG_TOKEN;
  process.env.TREG_TOKEN = "test-token";
  const originalFetch = globalThis.fetch;
  let callCount = 0;

  globalThis.fetch = async () => {
    callCount++;
    if (callCount === 1) {
      return new Response(JSON.stringify({ status: "processing", task_id: "t_1" }), {
        status: 202,
        headers: {
          "content-type": "application/json",
          "x-treg-async": JSON.stringify({ poll_url: "https://treg.to/tasks/t_1", final_statuses: ["completed"] }),
        },
      });
    }

    return new Response(JSON.stringify({ status: "completed", video_url: "https://cdn.example.com/video.mp4" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };

  try {
    const result = await callGrowthTool({
      toolId: "minimax.video-gen.h3.generate",
      data: { prompt: "sunset over ocean" },
      awaitAsync: true,
      asyncTimeoutSeconds: 10,
    });

    assert.equal(result.success, true);
    assert.equal(result.httpStatus, 200);
    assert.deepEqual(result.data, { status: "completed", video_url: "https://cdn.example.com/video.mp4" });
  } finally {
    globalThis.fetch = originalFetch;
    if (prevToken === undefined) delete process.env.TREG_TOKEN;
    else process.env.TREG_TOKEN = prevToken;
  }
});

test("submitGrowthFeedback posts category and message to /feedback", async () => {
  const prevToken = process.env.TREG_TOKEN;
  process.env.TREG_TOKEN = "test-token";
  const originalFetch = globalThis.fetch;
  let capturedBody;

  globalThis.fetch = async (_url, init) => {
    capturedBody = JSON.parse(init?.body || "{}");
    return new Response(JSON.stringify({ feedback_id: "fb_123", status: "received" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };

  try {
    const res = await submitGrowthFeedback({
      category: "other",
      message: "Need Crunchbase API in catalog",
    });

    assert.equal(res.success, true);
    assert.equal(res.feedbackId, "fb_123");
    assert.equal(capturedBody.category, "other");
    assert.equal(capturedBody.message, "Need Crunchbase API in catalog");
  } finally {
    globalThis.fetch = originalFetch;
    if (prevToken === undefined) delete process.env.TREG_TOKEN;
    else process.env.TREG_TOKEN = prevToken;
  }
});

test("getGrowthBalance fetches credit balance", async () => {
  const prevToken = process.env.TREG_TOKEN;
  process.env.TREG_TOKEN = "test-token";
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () => {
    return new Response(JSON.stringify({ balance_micro: 5000000, balance_usd: 5.0 }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };

  try {
    const res = await getGrowthBalance();
    assert.equal(res.success, true);
    assert.equal(res.balanceUsd, 5.0);
    assert.equal(res.balanceMicro, 5000000);
  } finally {
    globalThis.fetch = originalFetch;
    if (prevToken === undefined) delete process.env.TREG_TOKEN;
    else process.env.TREG_TOKEN = prevToken;
  }
});
