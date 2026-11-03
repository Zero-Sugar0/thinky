import assert from "node:assert/strict";
import crypto from "node:crypto";
import { test } from "node:test";
import {
  getRecallRegion,
  getRecallBaseUrl,
  fetch_with_retry,
  verifyRequestFromRecall,
  convert_to_readable_transcript,
  createMeetingBot,
} from "../agent/lib/recall.ts";

test("getRecallRegion accepts valid regions and throws on invalid", () => {
  const prev = process.env.RECALL_REGION;
  try {
    process.env.RECALL_REGION = "us-west-2";
    assert.equal(getRecallRegion(), "us-west-2");
    assert.equal(getRecallBaseUrl(), "https://us-west-2.recall.ai/api/v1");

    process.env.RECALL_REGION = "eu-central-1";
    assert.equal(getRecallRegion(), "eu-central-1");

    process.env.RECALL_REGION = "invalid-region";
    assert.throws(() => getRecallRegion(), /Invalid RECALL_REGION/);
  } finally {
    process.env.RECALL_REGION = prev;
  }
});

test("verifyRequestFromRecall accepts valid HMAC signatures and rejects tampered ones", () => {
  const secretKey = crypto.randomBytes(32).toString("base64");
  const secret = `whsec_${secretKey}`;
  const msgId = "msg_12345";
  const msgTimestamp = "1731705121";
  const payload = JSON.stringify({ event: "bot.in_call_recording", data: { bot_id: "bot_abc" } });

  const toSign = `${msgId}.${msgTimestamp}.${payload}`;
  const signature = crypto
    .createHmac("sha256", Buffer.from(secretKey, "base64"))
    .update(toSign)
    .digest("base64");

  const validHeaders = {
    "webhook-id": msgId,
    "webhook-timestamp": msgTimestamp,
    "webhook-signature": `v1,${signature}`,
  };

  // Valid verification must pass without error
  assert.doesNotThrow(() => {
    verifyRequestFromRecall({
      secret,
      headers: validHeaders,
      payload,
    });
  });

  // Tampered payload must throw
  assert.throws(() => {
    verifyRequestFromRecall({
      secret,
      headers: validHeaders,
      payload: JSON.stringify({ tampered: true }),
    });
  }, /No matching signature found/);

  // Missing headers must throw
  assert.throws(() => {
    verifyRequestFromRecall({
      secret,
      headers: {},
      payload,
    });
  }, /Missing webhook ID/);
});

test("convert_to_readable_transcript groups participant utterances into clean paragraphs", () => {
  const rawParts = [
    {
      participant: { id: 1, name: "Alice" },
      words: [
        { text: "Hello", start_timestamp: { relative: 0.5 }, end_timestamp: { relative: 1.0 } },
        { text: "everyone,", start_timestamp: { relative: 1.0 }, end_timestamp: { relative: 1.5 } },
      ],
    },
    {
      participant: { id: 1, name: "Alice" },
      words: [
        { text: "welcome to the meeting.", start_timestamp: { relative: 1.6 }, end_timestamp: { relative: 3.0 } },
      ],
    },
    {
      participant: { id: 2, name: "Bob" },
      words: [
        { text: "Thanks Alice,", start_timestamp: { relative: 3.2 }, end_timestamp: { relative: 4.0 } },
        { text: "glad to be here.", start_timestamp: { relative: 4.1 }, end_timestamp: { relative: 5.0 } },
      ],
    },
  ];

  const readable = convert_to_readable_transcript(rawParts);
  assert.equal(readable.length, 2);
  assert.equal(readable[0].speaker, "Alice");
  assert.equal(readable[0].paragraph, "Hello everyone, welcome to the meeting.");
  assert.equal(readable[0].duration_seconds, 2.5);

  assert.equal(readable[1].speaker, "Bob");
  assert.equal(readable[1].paragraph, "Thanks Alice, glad to be here.");
  assert.equal(readable[1].duration_seconds, 1.8);
});

test("fetch_with_retry retries on 429 status code respecting Retry-After", async () => {
  const originalFetch = globalThis.fetch;
  let attempts = 0;

  globalThis.fetch = async () => {
    attempts++;
    if (attempts === 1) {
      return new Response(null, {
        status: 429,
        headers: { "Retry-After": "0" },
      });
    }
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  };

  try {
    const res = await fetch_with_retry({
      url: "https://us-west-2.recall.ai/api/v1/bot/",
      options: {},
      max_attempts: 3,
    });
    assert.equal(res.status, 200);
    assert.equal(attempts, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("createMeetingBot rejects localhost and private IPs to avoid CloudFront 403", async () => {
  process.env.RECALL_API_KEY = "test_key";
  process.env.RECALL_REGION = "us-west-2";

  await assert.rejects(
    createMeetingBot({ meetingUrl: "http://localhost:3000/meet" }),
    /does not permit 'localhost' or IP addresses/,
  );
});

test("createMeetingBot dispatches valid payload and receives bot instance", async () => {
  process.env.RECALL_API_KEY = "test_key";
  process.env.RECALL_REGION = "us-west-2";
  const originalFetch = globalThis.fetch;
  let sentBody;

  globalThis.fetch = async (_url, init) => {
    sentBody = JSON.parse(init?.body);
    return new Response(
      JSON.stringify({
        id: "bot_123",
        meeting_url: sentBody.meeting_url,
        bot_name: sentBody.bot_name,
        join_at: sentBody.join_at,
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  };

  try {
    const bot = await createMeetingBot({
      meetingUrl: "https://meet.google.com/abc-defg-hij",
      botName: "Thinky Assistant",
      joinMessage: "Hello from Thinky",
    });

    assert.equal(bot.id, "bot_123");
    assert.equal(bot.meeting_url, "https://meet.google.com/abc-defg-hij");
    assert.equal(sentBody.bot_name, "Thinky Assistant");
    assert.equal(sentBody.chat.on_bot_join.message, "Hello from Thinky");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
