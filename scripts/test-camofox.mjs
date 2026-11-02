/**
 * Safely smoke-test browser open, navigate, snapshot, and cleanup.
 * Run with: node scripts/test-camofox.mjs
 */
import { randomUUID } from "node:crypto";
import { ACCESS_KEY, BASE } from "./camofox-config.mjs";

const userId = `thinky-browser-test-${randomUUID()}`;
const sessionKey = `browser-test-${randomUUID()}`;
const targetUrl = "https://example.com/";
let tabId;
let failed = false;

async function request(path, { method = "GET", body, authenticate = true } = {}) {
  const url = new URL(path, BASE);
  if (!url.searchParams.has("userId") && path !== "/health") {
    url.searchParams.set("userId", userId);
  }

  const response = await fetch(url, {
    method,
    ...(body ? { body: JSON.stringify(body) } : {}),
    headers: {
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(authenticate ? { Authorization: "Bearer " + ACCESS_KEY } : {}),
    },
    redirect: "error",
    signal: AbortSignal.timeout(20_000),
  });
  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : undefined;
  } catch {
    data = text;
  }
  if (!response.ok) {
    throw new Error(`Camofox returned HTTP ${response.status} for ${path}.`);
  }
  return data;
}

async function cleanup() {
  if (tabId) {
    try {
      await request(`/tabs/${encodeURIComponent(tabId)}`, { method: "DELETE" });
      console.log("Temporary tab closed.");
    } catch (error) {
      failed = true;
      console.error(`Could not close the temporary tab: ${error.message}`);
    }
  }

  try {
    await request(`/sessions/${encodeURIComponent(userId)}`, { method: "DELETE" });
    console.log("Temporary browser session deleted.");
  } catch (error) {
    failed = true;
    console.error(`Could not delete the temporary session: ${error.message}`);
  }
}

try {
  console.log("Checking Camofox health...");
  await request("/health", { authenticate: false });

  console.log("Opening a temporary example.com tab...");
  const tab = await request("/tabs", {
    method: "POST",
    body: { userId, sessionKey, url: targetUrl },
  });
  tabId = tab?.tabId;
  if (typeof tabId !== "string" || tabId.length === 0) {
    throw new Error("Camofox did not return a tab ID.");
  }

  console.log("Navigating to example.com...");
  await request(`/tabs/${encodeURIComponent(tabId)}/navigate`, {
    method: "POST",
    body: { userId, url: targetUrl },
  });

  console.log("Taking an accessibility snapshot...");
  const snapshot = await request(`/tabs/${encodeURIComponent(tabId)}/snapshot`);
  if (typeof snapshot?.snapshot !== "string" || !snapshot.url.includes("example.com")) {
    throw new Error("Camofox returned an unexpected snapshot for example.com.");
  }
  console.log(`Snapshot received for ${snapshot.url} (${snapshot.refsCount ?? "unknown"} refs).`);
  console.log(snapshot.snapshot.slice(0, 500));
} catch (error) {
  failed = true;
  console.error(`Browser smoke test failed: ${error.message}`);
} finally {
  await cleanup();
}

if (failed) {
  process.exitCode = 1;
} else {
  console.log("Browser smoke test passed.");
}
