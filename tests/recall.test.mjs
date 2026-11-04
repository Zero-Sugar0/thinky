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
  createAsyncTranscript,
  getTranscriptDownloadUrl,
  createMeetingVoiceToken,
  verifyMeetingVoiceToken,
} from "../agent/lib/recall.ts";

test("meeting voice tokens validate signatures and scheduled time claims", () => {
  const previousSecret = process.env.BETTER_AUTH_SECRET;
  process.env.BETTER_AUTH_SECRET = "test-meeting-signing-secret";

  try {
    const token = createMeetingVoiceToken(new Date(Date.now() + 60_000).toISOString());
    assert.equal(verifyMeetingVoiceToken(token), true);
    assert.equal(verifyMeetingVoiceToken(`${token}tampered`), false);
    assert.equal(verifyMeetingVoiceToken("not-a-token"), false);
  } finally {
    if (previousSecret === undefined) delete process.env.BETTER_AUTH_SECRET;
    else process.env.BETTER_AUTH_SECRET = previousSecret;
  }
});

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
  const previousEnv = {
    RECALL_API_KEY: process.env.RECALL_API_KEY,
    RECALL_REGION: process.env.RECALL_REGION,
    PUBLIC_API_BASE_URL: process.env.PUBLIC_API_BASE_URL,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
  };
  process.env.RECALL_API_KEY = "test_key";
  process.env.RECALL_REGION = "us-west-2";
  process.env.PUBLIC_API_BASE_URL = "https://thinky.example";
  process.env.BETTER_AUTH_SECRET = "test-meeting-signing-secret";
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
      enableRealtimeTranscript: true,
    });

    assert.equal(bot.id, "bot_123");
    assert.equal(bot.meeting_url, "https://meet.google.com/abc-defg-hij");
    assert.equal(sentBody.bot_name, "Thinky");
    assert.deepEqual(sentBody.variant, {
      zoom: "web_4_core",
      google_meet: "web_4_core",
      microsoft_teams: "web_4_core",
    });
    assert.match(sentBody.output_media.camera.config.url, /^https:\/\/thinky\.example\/meeting-agent\//);
    assert.equal(sentBody.recording_config.include_bot_in_recording.audio, true);
    assert.deepEqual(sentBody.recording_config.transcript, {
      provider: {
        deepgram_streaming: {
          model: "nova-3",
          language: "multi",
          mip_opt_out: true,
        },
      },
      diarization: {
        use_separate_streams_when_available: true,
      },
    });
    assert.deepEqual(sentBody.recording_config.realtime_endpoints, [
      {
        url: "https://thinky.example/api/webhooks/recall",
        type: "webhook",
        events: ["transcript.data"],
      },
    ]);
    assert.match(sentBody.chat.on_bot_join.message, /AI meeting facilitator/);
  } finally {
    globalThis.fetch = originalFetch;
    for (const [key, value] of Object.entries(previousEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test("createAsyncTranscript requests a private Deepgram transcript", async () => {
  const previousEnv = {
    RECALL_API_KEY: process.env.RECALL_API_KEY,
    RECALL_REGION: process.env.RECALL_REGION,
  };
  process.env.RECALL_API_KEY = "test_recall_key";
  process.env.RECALL_REGION = "us-west-2";
  const originalFetch = globalThis.fetch;
  let sentBody;

  globalThis.fetch = async (_url, init) => {
    sentBody = JSON.parse(init?.body);
    return new Response(null, { status: 200 });
  };

  try {
    await createAsyncTranscript("recording_123");
    assert.deepEqual(sentBody, {
      provider: {
        deepgram_async: {
          model: "nova-3",
          language: "multi",
          mip_opt_out: true,
        },
      },
      diarization: {
        use_separate_streams_when_available: true,
      },
    });

    test("getTranscriptDownloadUrl retrieves the artifact URL from Recall", async () => {
      const previousEnv = {
        RECALL_API_KEY: process.env.RECALL_API_KEY,
        RECALL_REGION: process.env.RECALL_REGION,
      };
      process.env.RECALL_API_KEY = "test_recall_key";
      process.env.RECALL_REGION = "us-west-2";
      const originalFetch = globalThis.fetch;
      let requestedUrl;

      globalThis.fetch = async (url, init) => {
        requestedUrl = String(url);
        assert.equal(init?.method, "GET");
        assert.equal(new Headers(init?.headers).get("Authorization"), "test_recall_key");
        return new Response(
          JSON.stringify({ data: { download_url: "https://downloads.recall.ai/transcript.json" } }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      };

      try {
        assert.equal(await getTranscriptDownloadUrl("transcript_123"), "https://downloads.recall.ai/transcript.json");
        assert.equal(requestedUrl, "https://us-west-2.recall.ai/api/v1/transcript/transcript_123/");
      } finally {
        globalThis.fetch = originalFetch;
        for (const [key, value] of Object.entries(previousEnv)) {
          if (value === undefined) delete process.env[key];
          else process.env[key] = value;
        }
      }
    });
  } finally {
    globalThis.fetch = originalFetch;
    for (const [key, value] of Object.entries(previousEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
