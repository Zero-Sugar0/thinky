
/**
 * Standalone Camofox Browser Test Script
 * Run with: node test-camofox.mjs
 */
import { API_KEY, BASE } from "./camofox-config.mjs";

const USER_ID = "test-script";
const SESSION_KEY = "manual-test";

async function camofox(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(API_KEY ? { Authorization: `Bearer ${API_KEY}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers,
  });

  const text = await res.text();
  let data;

  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  if (!res.ok) {
    console.error("❌ Error:", res.status, data);
    throw new Error(`Request failed: ${res.status}`);
  }

  return data;
}

function log(title, data) {
  console.log("\n" + "=".repeat(60));
  console.log("▶", title);
  console.log("=".repeat(60));
  console.log(
    typeof data === "string"
      ? data
      : JSON.stringify(data, null, 2)
  );
}

async function main() {
  console.log("🚀 Starting Camofox test...\n");

  // 1. Health check
  const health = await camofox("/health");
  log("Health Check", health);

  // 2. Open a tab
  const tab = await camofox("/tabs", {
    method: "POST",
    body: JSON.stringify({
      userId: USER_ID,
      sessionKey: SESSION_KEY,
      url: "https://example.com",
    }),
  });

  log("Opened Tab", tab);

  const tabId = tab.tabId;

  // 3. Take snapshot
  const snapshot1 = await camofox(
    `/tabs/${tabId}/snapshot?userId=${USER_ID}`
  );

  log("Snapshot (example.com)", {
    url: snapshot1.url,
    refsCount: snapshot1.refsCount,
    snapshot: snapshot1.snapshot,
  });

  // 4. Click the "Learn more" link (ref e1)
  const clickResult = await camofox(
    `/tabs/${tabId}/click`,
    {
      method: "POST",
      body: JSON.stringify({
        userId: USER_ID,
        ref: "e1",
      }),
    }
  );

  log("Clicked e1 (Learn more)", clickResult);

  // 5. Snapshot after click
  const snapshot2 = await camofox(
    `/tabs/${tabId}/snapshot?userId=${USER_ID}`
  );

  log("Snapshot after click", {
    url: snapshot2.url,
    snapshot: snapshot2.snapshot?.slice(0, 500) + "...",
  });

  // 6. Navigate using a search macro
  const nav = await camofox(
    `/tabs/${tabId}/navigate`,
    {
      method: "POST",
      body: JSON.stringify({
        userId: USER_ID,
        macro: "@google_search",
        query: "Camoufox browser",
      }),
    }
  );

  log("Navigated with @google_search", nav);

  // Wait a moment for the page to load
  await new Promise((r) => setTimeout(r, 2500));

  // 7. Snapshot of Google results
  const snapshot3 = await camofox(
    `/tabs/${tabId}/snapshot?userId=${USER_ID}`
  );

  log("Google Search Snapshot", {
    url: snapshot3.url,
    snapshot: snapshot3.snapshot?.slice(0, 800) + "...",
  });

  // 8. List tabs
  const tabs = await camofox(`/tabs?userId=${USER_ID}`);
  log("Open Tabs", tabs);

  // 9. Close the tab
  await camofox(
    `/tabs/${tabId}?userId=${USER_ID}`,
    {
      method: "DELETE",
    }
  );

  log("Closed Tab", {
    tabId,
    status: "closed",
  });

  // 10. Final cleanup (optional - destroy whole session)
  await camofox(
    `/sessions/${USER_ID}`,
    {
      method: "DELETE",
    }
  );

  log("Session Destroyed", {
    userId: USER_ID,
  });

  console.log("\n✅ Test completed successfully!\n");
}

main().catch((err) => {
  console.error("\n💥 Test failed:", err.message);
  process.exit(1);
});
