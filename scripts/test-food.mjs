
/**
 * Camofox Food Ordering Flow Test
 * Tests browsing a food delivery site without an agent.
 * Run: node test-food.mjs
 */
import { ACCESS_KEY, BASE } from "./camofox-config.mjs";

const USER_ID = "food-test";
const SESSION_KEY = "order-demo";

// Change this to whatever you want to test
const TARGET_URL = "https://www.doordash.com"; // or https://www.ubereats.com

async function camofox(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${ACCESS_KEY}`,
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
    console.error("❌", res.status, data);
    throw new Error(`Request failed: ${res.status}`);
  }

  return data;
}

function log(title, data) {
  console.log("\n" + "─".repeat(60));
  console.log("▶", title);
  console.log("─".repeat(60));

  if (typeof data === "string") {
    console.log(
      data.slice(0, 1200) +
        (data.length > 1200 ? "\n... (truncated)" : "")
    );
  } else {
    console.log(JSON.stringify(data, null, 2));
  }
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  console.log("🍔 Starting Food Ordering Flow Test\n");
  console.log("Target:", TARGET_URL);

  // 1. Health
  const health = await camofox("/health");
  log("Health", health);

  // 2. Open the food site
  const tab = await camofox("/tabs", {
    method: "POST",
    body: JSON.stringify({
      userId: USER_ID,
      sessionKey: SESSION_KEY,
      url: TARGET_URL,
    }),
  });

  log("Opened Tab", tab);

  const tabId = tab.tabId;

  // Give the page time to load (these sites are heavy)
  console.log("\n⏳ Waiting 4s for page to load...");
  await sleep(4000);

  // 3. First snapshot
  let snap = await camofox(
    `/tabs/${tabId}/snapshot?userId=${USER_ID}`
  );

  log("Initial Snapshot", {
    url: snap.url,
    refsCount: snap.refsCount,
    snapshot: snap.snapshot,
  });

  // 4. Try to find a search / address input and type into it
  // (This is best-effort — sites change often)
  console.log("\n⏳ Looking for an address / search box...");

  // Simple heuristic: look for common refs that might be inputs
  // In a real agent the LLM decides which ref to use.
  // Here we just demonstrate typing if we can find something.

  // Scroll down a bit so more content loads
  await camofox(`/tabs/${tabId}/scroll`, {
    method: "POST",
    body: JSON.stringify({
      userId: USER_ID,
      direction: "down",
      amount: 800,
    }),
  });

  await sleep(1500);

  snap = await camofox(
    `/tabs/${tabId}/snapshot?userId=${USER_ID}`
  );

  log("Snapshot after scroll", {
    url: snap.url,
    snapshot: snap.snapshot?.slice(0, 1000),
  });

  // 5. List tabs
  const tabs = await camofox(`/tabs?userId=${USER_ID}`);
  log("Open Tabs", tabs);

  // 6. Current live URL the agent would report
  console.log("\n" + "═".repeat(60));
  console.log("🌐 LIVE URL (what the agent should show you):");
  console.log("   ", snap.url);
  console.log("═".repeat(60));

  // 7. Cleanup
  await camofox(
    `/tabs/${tabId}?userId=${USER_ID}`,
    {
      method: "DELETE",
    }
  );

  await camofox(
    `/sessions/${USER_ID}`,
    {
      method: "DELETE",
    }
  );

  log("Cleanup", {
    status: "done",
  });

  console.log("\n✅ Food flow test finished\n");
  console.log("Note: Full ordering (login + cart + payment) needs");
  console.log("saved cookies + human confirmation on the final step.\n");
}

main().catch((err) => {
  console.error("\n💥 Test failed:", err.message);
  process.exit(1);
});
