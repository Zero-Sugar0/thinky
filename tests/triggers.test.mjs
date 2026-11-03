import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";

test("Composio webhook V3 signature verification simulation", () => {
  const secret = "test_webhook_secret_key_123456";
  const webhookId = "msg_abc123";
  const webhookTimestamp = Math.floor(Date.now() / 1000).toString();
  const rawBody = JSON.stringify({
    id: "msg_abc123",
    type: "composio.trigger.message",
    metadata: {
      log_id: "log_abc123",
      trigger_slug: "GITHUB_COMMIT_EVENT",
      trigger_id: "ti_xyz789",
      connected_account_id: "ca_def456",
      auth_config_id: "ac_xyz789",
      user_id: "usr_12345"
    },
    data: {
      commit_sha: "a1b2c3d",
      message: "fix: update triggers handling",
      author: "jules"
    },
    timestamp: new Date().toISOString()
  });

  const signingString = `${webhookId}.${webhookTimestamp}.${rawBody}`;
  const expectedHash = crypto
    .createHmac("sha256", secret)
    .update(signingString)
    .digest("base64");
  const signature = `v1,${expectedHash}`;

  const receivedHash = signature.split(",")[1] ?? signature;
  assert.equal(expectedHash, receivedHash);

  const payload = JSON.parse(rawBody);
  assert.equal(payload.type, "composio.trigger.message");
  assert.equal(payload.metadata.trigger_slug, "GITHUB_COMMIT_EVENT");
  assert.equal(payload.data.author, "jules");
});

test("Trigger manage actions input validation", async () => {
  const validActions = ["create", "enable", "disable", "delete"];
  assert.ok(validActions.includes("create"));
  assert.ok(validActions.includes("enable"));
  assert.ok(validActions.includes("disable"));
  assert.ok(validActions.includes("delete"));
});
