/**
 * Verify Camofox access-key enforcement without creating browser state.
 * Run with: node scripts/test-camofox-access-key.mjs
 */
import { ACCESS_KEY, BASE } from "./camofox-config.mjs";

function sanitizeBody(body) {
  return body
    .replaceAll(ACCESS_KEY, "[REDACTED]")
    .replace(/Bearer\s+\S+/gi, "Bearer [REDACTED]")
    .slice(0, 500);
}

async function check(label, expectedStatus, authenticate) {
  const url = new URL(authenticate === undefined ? "/health" : "/tabs", BASE);
  if (authenticate !== undefined) {
    url.searchParams.set("userId", "test");
  }

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      ...(authenticate ? { Authorization: `Bearer ${ACCESS_KEY}` } : {}),
    },
    redirect: "error",
    signal: AbortSignal.timeout(20_000),
  });
  const body = await response.text();
  const passed = response.status === expectedStatus;
  console.log(`${label}: HTTP ${response.status} ${passed ? "PASS" : `FAIL (expected ${expectedStatus})`}`);
  if (!passed) {
    console.error(`Response body: ${sanitizeBody(body) || "(empty)"}`);
  }
  return passed;
}

let passed = true;
try {
  passed = await check("GET /health without key", 200) && passed;
  passed = await check("GET /tabs?userId=test without key", 401, false) && passed;
  passed = await check("GET /tabs?userId=test with access key", 200, true) && passed;
} catch (error) {
  console.error(`Access-key test could not complete: ${error.message}`);
  passed = false;
}

if (!passed) {
  process.exitCode = 1;
} else {
  console.log("Camofox access-key enforcement passed.");
}
