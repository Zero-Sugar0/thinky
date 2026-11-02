import assert from "node:assert/strict";
import { test } from "node:test";
import {
  camofoxPostBody,
  camofoxRequest,
  createCamofoxLiveViewerUrl,
  getCamofoxUserId,
  CamofoxTabIdSchema,
  readCamofoxScreenshot,
  validateCamofoxTargetUrl,
} from "../agent/lib/camofox.ts";

test("Camofox identities are stable, opaque, and distinct per authenticated user", () => {
  const first = getCamofoxUserId({ principalId: "user-1", principalType: "user" });
  const second = getCamofoxUserId({ principalId: "user-2", principalType: "user" });

  assert.equal(first, getCamofoxUserId({ principalId: "user-1", principalType: "user" }));
  assert.notEqual(first, second);
  assert.match(first, /^thinky_[a-f0-9]{64}$/);
  assert.ok(!first.includes("user-1"));
});

test("Camofox refuses absent and non-user identities", () => {
  assert.throws(() => getCamofoxUserId(null), /authenticated user session/);
  assert.throws(
    () => getCamofoxUserId({ principalId: "eve:app", principalType: "runtime" }),
    /authenticated user session/,
  );
  assert.throws(
    () => getCamofoxUserId({ principalId: "  ", principalType: "user" }),
    /authenticated user session/,
  );
});

test("Camofox accepts public HTTPS URLs and rejects local, IP, and credentialed targets", () => {
  assert.equal(validateCamofoxTargetUrl("https://example.com/search?q=tea"), "https://example.com/search?q=tea");
  assert.throws(() => validateCamofoxTargetUrl("http://example.com"), /public HTTPS/);
  assert.throws(() => validateCamofoxTargetUrl("https://127.0.0.1"), /public HTTPS/);
  assert.throws(() => validateCamofoxTargetUrl("https://[::1]"), /public HTTPS/);
  assert.throws(() => validateCamofoxTargetUrl("https://service.internal"), /public HTTPS/);
  assert.throws(() => validateCamofoxTargetUrl("https://user:pass@example.com"), /public HTTPS/);
});

test("Camofox tab IDs cannot alter endpoint paths", () => {
  assert.equal(CamofoxTabIdSchema.safeParse("tab-123:abc").success, true);
  assert.equal(CamofoxTabIdSchema.safeParse("../other-tab").success, false);
  assert.equal(CamofoxTabIdSchema.safeParse("tab/other").success, false);
});

test("Camofox screenshot bytes are returned as a model- and UI-usable base64 image", async () => {
  const imageBytes = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jZC8AAAAASUVORK5CYII=",
    "base64",
  );
  const screenshot = await readCamofoxScreenshot(
    new Response(imageBytes, { headers: { "content-type": "image/png" } }),
  );

  assert.equal(screenshot.mimeType, "image/png");
  assert.equal(screenshot.bytes, imageBytes.byteLength);
  assert.equal(Buffer.from(screenshot.screenshotBase64, "base64").toString("hex"), imageBytes.toString("hex"));
});

test("Camofox rejects screenshot data whose bytes do not match the content type", async () => {
  await assert.rejects(
    readCamofoxScreenshot(
      new Response("not a png image", { headers: { "content-type": "image/png" } }),
    ),
    /do not match the declared image\/png format/,
  );
});

test("Camofox includes the same owner in URL and mutation payload", async () => {
  const previousBaseUrl = process.env.CAMOFOX_BASE_URL;
  const previousAccessKey = process.env.CAMOFOX_ACCESS_KEY;
  const originalFetch = globalThis.fetch;
  const userId = getCamofoxUserId({ principalId: "user-1", principalType: "user" });
  let requestUrl;
  let requestInit;

  process.env.CAMOFOX_BASE_URL = "https://browser.example";
  process.env.CAMOFOX_ACCESS_KEY = "test-api-key";
  globalThis.fetch = async (url, init) => {
    requestUrl = new URL(url);
    requestInit = init;
    return new Response('{"ok":true}', {
      headers: { "content-type": "application/json" },
    });
  };

  try {
    const response = await camofoxRequest(
      "/tabs/tab%2Fwith%20spaces/click",
      userId,
      new AbortController().signal,
      "test click",
      { method: "POST", body: camofoxPostBody(userId, { ref: "e1" }) },
    );
    assert.equal(requestUrl.searchParams.get("userId"), userId);
    assert.equal(requestUrl.pathname, "/tabs/tab%2Fwith%20spaces/click");
    assert.equal(JSON.parse(requestInit.body).userId, userId);
    assert.equal(new Headers(requestInit.headers).get("authorization"), "Bearer test-api-key");
    assert.deepEqual(await response.json(), { ok: true });
  } finally {
    globalThis.fetch = originalFetch;
    if (previousBaseUrl === undefined) delete process.env.CAMOFOX_BASE_URL;
    else process.env.CAMOFOX_BASE_URL = previousBaseUrl;
    if (previousAccessKey === undefined) delete process.env.CAMOFOX_ACCESS_KEY;
    else process.env.CAMOFOX_ACCESS_KEY = previousAccessKey;
  }
});

test("Camofox retries transient screenshot GET failures once", async () => {
  const previousBaseUrl = process.env.CAMOFOX_BASE_URL;
  const previousAccessKey = process.env.CAMOFOX_ACCESS_KEY;
  const originalFetch = globalThis.fetch;
  let attempts = 0;
  process.env.CAMOFOX_BASE_URL = "https://browser.example";
  process.env.CAMOFOX_ACCESS_KEY = "test-api-key";
  globalThis.fetch = async () => {
    attempts++;
    return attempts === 1
      ? new Response(null, { status: 503 })
      : new Response("screenshot", { status: 200 });
  };

  try {
    const response = await camofoxRequest(
      "/tabs/tab-1/screenshot",
      "thinky_test",
      new AbortController().signal,
      "capture screenshot",
      {},
      { retryUnavailable: true },
    );
    assert.equal(attempts, 2);
    assert.equal(await response.text(), "screenshot");
  } finally {
    globalThis.fetch = originalFetch;
    if (previousBaseUrl === undefined) delete process.env.CAMOFOX_BASE_URL;
    else process.env.CAMOFOX_BASE_URL = previousBaseUrl;
    if (previousAccessKey === undefined) delete process.env.CAMOFOX_ACCESS_KEY;
    else process.env.CAMOFOX_ACCESS_KEY = previousAccessKey;
  }
});

test("Camofox issues a short-lived signed viewer link for the authenticated owner and tab", async () => {
  const previousBaseUrl = process.env.CAMOFOX_BASE_URL;
  const previousAccessKey = process.env.CAMOFOX_ACCESS_KEY;
  const originalFetch = globalThis.fetch;
  const userId = getCamofoxUserId({ principalId: "user-1", principalType: "user" });
  let requestUrl;
  let requestInit;

  process.env.CAMOFOX_BASE_URL = "https://browser.example";
  process.env.CAMOFOX_ACCESS_KEY = "test-access-key";
  globalThis.fetch = async (url, init) => {
    requestUrl = new URL(url);
    requestInit = init;
    return new Response(JSON.stringify({
      url: "https://browser.example/live-viewer/view?t=signed.token",
    }), {
      headers: { "content-type": "application/json" },
    });
  };

  try {
    const viewerUrl = await createCamofoxLiveViewerUrl(
      "tab-123",
      userId,
      new AbortController().signal,
    );
    assert.equal(viewerUrl, "https://browser.example/live-viewer/view?t=signed.token");
    assert.equal(requestUrl.pathname, "/live-viewer/links");
    assert.equal(requestUrl.searchParams.get("userId"), userId);
    assert.equal(new Headers(requestInit.headers).get("authorization"), "Bearer test-access-key");
    assert.deepEqual(JSON.parse(requestInit.body), {
      tabId: "tab-123",
      ttlSeconds: 120,
      userId,
    });
  } finally {
    globalThis.fetch = originalFetch;
    if (previousBaseUrl === undefined) delete process.env.CAMOFOX_BASE_URL;
    else process.env.CAMOFOX_BASE_URL = previousBaseUrl;
    if (previousAccessKey === undefined) delete process.env.CAMOFOX_ACCESS_KEY;
    else process.env.CAMOFOX_ACCESS_KEY = previousAccessKey;
  }
});

test("Camofox rejects an unsigned or insecure live-viewer URL", async () => {
  const previousBaseUrl = process.env.CAMOFOX_BASE_URL;
  const previousAccessKey = process.env.CAMOFOX_ACCESS_KEY;
  const originalFetch = globalThis.fetch;
  process.env.CAMOFOX_BASE_URL = "https://browser.example";
  process.env.CAMOFOX_ACCESS_KEY = "test-access-key";
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ url: "http://attacker.example/view?t=forged" }), {
      headers: { "content-type": "application/json" },
    });

  try {
    await assert.rejects(
      createCamofoxLiveViewerUrl("tab-123", "thinky_test", new AbortController().signal),
      /invalid signed live viewer URL/,
    );
  } finally {
    globalThis.fetch = originalFetch;
    if (previousBaseUrl === undefined) delete process.env.CAMOFOX_BASE_URL;
    else process.env.CAMOFOX_BASE_URL = previousBaseUrl;
    if (previousAccessKey === undefined) delete process.env.CAMOFOX_ACCESS_KEY;
    else process.env.CAMOFOX_ACCESS_KEY = previousAccessKey;
  }
});

test("Camofox does not retry failed browser mutations", async () => {
  const previousBaseUrl = process.env.CAMOFOX_BASE_URL;
  const previousAccessKey = process.env.CAMOFOX_ACCESS_KEY;
  const originalFetch = globalThis.fetch;
  let attempts = 0;
  process.env.CAMOFOX_BASE_URL = "https://browser.example";
  process.env.CAMOFOX_ACCESS_KEY = "test-api-key";
  globalThis.fetch = async () => {
    attempts++;
    return new Response(null, { status: 503 });
  };

  try {
    await assert.rejects(
      camofoxRequest(
        "/tabs",
        "thinky_test",
        new AbortController().signal,
        "open tab",
        { method: "POST", body: "{}" },
        { retryUnavailable: true },
      ),
      /Browser open tab is temporarily unavailable \(HTTP 503\)/,
    );
    assert.equal(attempts, 1);
  } finally {
    globalThis.fetch = originalFetch;
    if (previousBaseUrl === undefined) delete process.env.CAMOFOX_BASE_URL;
    else process.env.CAMOFOX_BASE_URL = previousBaseUrl;
    if (previousAccessKey === undefined) delete process.env.CAMOFOX_ACCESS_KEY;
    else process.env.CAMOFOX_ACCESS_KEY = previousAccessKey;
  }
});

test("Camofox propagates caller cancellation", async () => {
  const previousBaseUrl = process.env.CAMOFOX_BASE_URL;
  const previousAccessKey = process.env.CAMOFOX_ACCESS_KEY;
  const originalFetch = globalThis.fetch;
  const controller = new AbortController();
  process.env.CAMOFOX_BASE_URL = "https://browser.example";
  process.env.CAMOFOX_ACCESS_KEY = "test-api-key";
  globalThis.fetch = async (_url, init) =>
    new Promise((_, reject) => {
      init.signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), {
        once: true,
      });
    });

  try {
    const request = camofoxRequest("/tabs", "thinky_test", controller.signal, "list tabs");
    controller.abort();
    await assert.rejects(request, /was cancelled/);
  } finally {
    globalThis.fetch = originalFetch;
    if (previousBaseUrl === undefined) delete process.env.CAMOFOX_BASE_URL;
    else process.env.CAMOFOX_BASE_URL = previousBaseUrl;
    if (previousAccessKey === undefined) delete process.env.CAMOFOX_ACCESS_KEY;
    else process.env.CAMOFOX_ACCESS_KEY = previousAccessKey;
  }
});

test("Camofox does not expose upstream error response bodies", async () => {
  const previousBaseUrl = process.env.CAMOFOX_BASE_URL;
  const previousAccessKey = process.env.CAMOFOX_ACCESS_KEY;
  const originalFetch = globalThis.fetch;
  process.env.CAMOFOX_BASE_URL = "https://browser.example";
  process.env.CAMOFOX_ACCESS_KEY = "test-api-key";
  globalThis.fetch = async () => new Response("sensitive upstream details", { status: 500 });

  try {
    await assert.rejects(
      camofoxRequest(
        "/tabs",
        "thinky_test",
        new AbortController().signal,
        "list tabs",
      ),
      (error) => {
        assert.match(error.message, /HTTP 500/);
        assert.ok(!error.message.includes("sensitive upstream details"));
        return true;
      },
    );
  } finally {
    globalThis.fetch = originalFetch;
    if (previousBaseUrl === undefined) delete process.env.CAMOFOX_BASE_URL;
    else process.env.CAMOFOX_BASE_URL = previousBaseUrl;
    if (previousAccessKey === undefined) delete process.env.CAMOFOX_ACCESS_KEY;
    else process.env.CAMOFOX_ACCESS_KEY = previousAccessKey;
  }
});
