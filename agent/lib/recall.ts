import crypto from "node:crypto";
import { Buffer } from "node:buffer";

/**
 * Recall.ai Client Library
 * Handles bot creation, lifecycle, transcription, and webhook verification.
 */

export type RecallRegion = "us-west-2" | "us-east-1" | "eu-central-1" | "ap-northeast-1";

export function getRecallRegion(): RecallRegion {
  const region = (process.env.RECALL_REGION || "us-west-2").toLowerCase();
  const valid: RecallRegion[] = ["us-west-2", "us-east-1", "eu-central-1", "ap-northeast-1"];
  if (!valid.includes(region as RecallRegion)) {
    throw new Error(
      `Invalid RECALL_REGION '${region}'. Only 'us-west-2', 'us-east-1', 'eu-central-1', 'ap-northeast-1' are supported.`,
    );
  }
  return region as RecallRegion;
}

export function getRecallBaseUrl(): string {
  const region = getRecallRegion();
  return `https://${region}.recall.ai/api/v1`;
}

export function getRecallApiKey(): string {
  const key = process.env.RECALL_API_KEY;
  if (!key) {
    throw new Error("RECALL_API_KEY environment variable is missing.");
  }
  return key;
}

export function getPublicApiBaseUrl(): string | undefined {
  return (
    process.env.PUBLIC_API_BASE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : undefined) ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined) ||
    process.env.NUXT_PUBLIC_SITE_URL ||
    undefined
  );
}

function getMeetingVoiceSigningSecret(): string {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) {
    throw new Error("BETTER_AUTH_SECRET environment variable is missing.");
  }
  return secret;
}

export function createMeetingVoiceToken(joinAt: string): string {
  const scheduledAt = Date.parse(joinAt);
  if (!Number.isFinite(scheduledAt)) {
    throw new Error("Meeting join time must be a valid ISO 8601 timestamp.");
  }

  const now = Math.floor(Date.now() / 1000);
  const joinAtSeconds = Math.floor(scheduledAt / 1000);
  const payload = {
    purpose: "meeting-voice",
    notBefore: Math.max(now - 60, joinAtSeconds - 15 * 60),
    expiresAt: joinAtSeconds + 8 * 60 * 60,
    nonce: crypto.randomBytes(16).toString("base64url"),
  };
  if (payload.expiresAt <= now) {
    throw new Error("Meeting join time is too far in the past to start a voice session.");
  }

  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", getMeetingVoiceSigningSecret()).update(encodedPayload).digest("base64url");
  return `${encodedPayload}.${signature}`;
}

export function verifyMeetingVoiceToken(token: string): boolean {
  const [encodedPayload, signature, extra] = token.split(".");
  if (!encodedPayload || !signature || extra !== undefined) return false;

  const expected = crypto.createHmac("sha256", getMeetingVoiceSigningSecret()).update(encodedPayload).digest();
  let actual: Buffer;
  try {
    actual = Buffer.from(signature, "base64url");
  } catch {
    return false;
  }
  if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) return false;

  let payload: unknown;
  try {
    payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));
  } catch {
    return false;
  }
  if (typeof payload !== "object" || payload === null) return false;

  const claims = payload as Record<string, unknown>;
  const now = Math.floor(Date.now() / 1000);
  return (
    claims.purpose === "meeting-voice" &&
    typeof claims.notBefore === "number" &&
    typeof claims.expiresAt === "number" &&
    typeof claims.nonce === "string" &&
    claims.notBefore <= now &&
    claims.expiresAt > now
  );
}

/**
 * Required fetch with retry mechanism handling:
 * - 429: Rate limit exceeded (respects Retry-After + jitter)
 * - 503: Temporary outage (waits 10s + jitter)
 * - 507: Ad-hoc bot pool drained (waits 30s + jitter)
 */
export async function fetch_with_retry(args: {
  url: string;
  options: RequestInit;
  max_attempts?: number;
}): Promise<Response> {
  const { url, options, max_attempts = 6 } = args;
  for (let attempt = 1; attempt <= max_attempts; attempt++) {
    const response = await fetch(url, options);
    let wait_for: number | null = null;

    switch (response.status) {
      case 429: {
        const header = response.headers.get("Retry-After");
        wait_for = header ? parseInt(header, 10) : 5;
        break;
      }
      case 503: {
        wait_for = 10;
        break;
      }
      case 507: {
        wait_for = 30;
        break;
      }
    }

    if (wait_for !== null && attempt < max_attempts) {
      const jitterMs = Math.ceil(Math.random() * 5) * 1000;
      await new Promise((resolve) => setTimeout(resolve, wait_for * 1000 + jitterMs));
      continue;
    }

    return response;
  }

  throw new Error(`Max attempts (${max_attempts}) reached while fetching ${url}`);
}

/**
 * Verifies that incoming webhooks, websockets, or callbacks were genuinely sent by Recall.ai
 * using HMAC SHA-256 signatures with constant-time equality check.
 */
export function verifyRequestFromRecall(args: {
  secret: string;
  headers: Record<string, string>;
  payload: string | Buffer | null;
}): void {
  const { secret, headers, payload } = args;
  const msgId = headers["webhook-id"] ?? headers["svix-id"];
  const msgTimestamp = headers["webhook-timestamp"] ?? headers["svix-timestamp"];
  const msgSignature = headers["webhook-signature"] ?? headers["svix-signature"];

  if (!secret || (!secret.startsWith("whsec_") && secret.length < 16)) {
    throw new Error("Verification secret is missing or invalid");
  }
  if (!msgId || !msgTimestamp || !msgSignature) {
    throw new Error(`Missing webhook ID (${msgId}), timestamp (${msgTimestamp}), or signature (${msgSignature})`);
  }

  const prefix = "whsec_";
  const base64Part = secret.startsWith(prefix) ? secret.slice(prefix.length) : secret;
  const key = Buffer.from(base64Part, "base64");

  let payloadStr = "";
  if (payload) {
    if (Buffer.isBuffer(payload)) {
      payloadStr = payload.toString("utf8");
    } else if (typeof payload === "string") {
      payloadStr = payload;
    }
  }

  const toSign = `${msgId}.${msgTimestamp}.${payloadStr}`;
  const expectedSig = crypto.createHmac("sha256", key).update(toSign).digest("base64");

  const passedSigs = msgSignature.split(" ");
  for (const versionedSig of passedSigs) {
    const [version, signature] = versionedSig.split(",");
    if (version !== "v1" || !signature) {
      continue;
    }
    const sigBytes = Buffer.from(signature, "base64");
    const expectedSigBytes = Buffer.from(expectedSig, "base64");
    if (
      expectedSigBytes.length === sigBytes.length &&
      crypto.timingSafeEqual(new Uint8Array(expectedSigBytes), new Uint8Array(sigBytes))
    ) {
      return;
    }
  }

  throw new Error("No matching signature found");
}

export interface CreateBotOptions {
  meetingUrl: string;
  botName?: string;
  joinAt?: string;
  joinMessage?: string;
  enableRealtimeTranscript?: boolean;
}

export interface BotInstance {
  id: string;
  meeting_url: string;
  bot_name?: string;
  join_at?: string;
  status_changes?: Array<{ code: string; created_at: string; message?: string }>;
  recordings?: Array<{
    id: string;
    media_shortcuts?: {
      transcript?: {
        id: string;
        data?: { download_url: string };
      };
    };
  }>;
  [key: string]: unknown;
}

/**
 * Creates and schedules a Recall meeting bot.
 */
export async function createMeetingBot(options: CreateBotOptions): Promise<BotInstance> {
  const apiKey = getRecallApiKey();
  const baseUrl = getRecallBaseUrl();
  const publicBaseUrl = getPublicApiBaseUrl();

  const botName = options.botName || "Thinky";
  const joinAt = options.joinAt || new Date().toISOString();
  // Validate meeting URL: CloudFront 403 prevention (no localhost or private IP in request body)
  if (options.meetingUrl.includes("localhost") || options.meetingUrl.includes("127.0.0.1")) {
    throw new Error("Recall.ai does not permit 'localhost' or IP addresses in meeting URLs.");
  }

  if (!publicBaseUrl) {
    throw new Error("PUBLIC_API_BASE_URL is required for the meeting voice facilitator.");
  }
  const publicUrl = new URL(publicBaseUrl);
  if (publicUrl.protocol !== "https:" || publicUrl.hostname === "localhost" || publicUrl.hostname.endsWith(".localhost")) {
    throw new Error("PUBLIC_API_BASE_URL must be a publicly reachable HTTPS URL for the meeting voice facilitator.");
  }

  const voiceToken = createMeetingVoiceToken(joinAt);
  const recordingConfig: Record<string, unknown> = {
    include_bot_in_recording: {
      audio: true,
    },
  };
  if (options.enableRealtimeTranscript) {
    recordingConfig.transcript = {
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
    };
    recordingConfig.realtime_endpoints = [
      {
        url: `${publicUrl.origin}/api/webhooks/recall`,
        type: "webhook",
        events: ["transcript.data"],
      },
    ];
  }

  const payload: Record<string, unknown> = {
    meeting_url: options.meetingUrl,
    join_at: joinAt,
    bot_name: botName,
    variant: {
      zoom: "web_4_core",
      google_meet: "web_4_core",
      microsoft_teams: "web_4_core",
    },
    recording_config: recordingConfig,
    output_media: {
      camera: {
        kind: "webpage",
        config: {
          url: `${publicUrl.origin}/meeting-agent/${voiceToken}`,
        },
      },
    },
    chat: {
      on_bot_join: {
        send_to: "everyone",
        message:
          options.joinMessage ||
          "Thinky is an AI meeting facilitator. I’ll help guide the discussion and capture notes.",
        pin: true,
      },
    },
  };

  const response = await fetch_with_retry({
    url: `${baseUrl}/bot/`,
    options: {
      method: "POST",
      headers: {
        Authorization: apiKey,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`Failed to create meeting bot (${response.status}): ${errorText || response.statusText}`);
  }

  return (await response.json()) as BotInstance;
}

/**
 * Retrieves a bot instance by bot ID.
 */
export async function getMeetingBot(botId: string): Promise<BotInstance> {
  const apiKey = getRecallApiKey();
  const baseUrl = getRecallBaseUrl();

  const response = await fetch_with_retry({
    url: `${baseUrl}/bot/${encodeURIComponent(botId)}/`,
    options: {
      method: "GET",
      headers: {
        Authorization: apiKey,
        Accept: "application/json",
      },
    },
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`Failed to retrieve bot '${botId}' (${response.status}): ${errorText || response.statusText}`);
  }

  return (await response.json()) as BotInstance;
}

/**
 * Removes a bot from an active meeting call.
 */
export async function leaveMeetingBot(botId: string): Promise<void> {
  const apiKey = getRecallApiKey();
  const baseUrl = getRecallBaseUrl();

  const response = await fetch_with_retry({
    url: `${baseUrl}/bot/${encodeURIComponent(botId)}/leave_call/`,
    options: {
      method: "POST",
      headers: {
        Authorization: apiKey,
        Accept: "application/json",
      },
    },
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`Failed to remove bot from call (${response.status}): ${errorText || response.statusText}`);
  }
}

/**
 * Requests an asynchronous post-meeting transcript for a recording.
 */
export async function createAsyncTranscript(recordingId: string): Promise<void> {
  const apiKey = getRecallApiKey();
  const baseUrl = getRecallBaseUrl();

  const response = await fetch_with_retry({
    url: `${baseUrl}/recording/${encodeURIComponent(recordingId)}/create_transcript/`,
    options: {
      method: "POST",
      headers: {
        Authorization: apiKey,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
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
      }),
    },
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`Failed to create async transcript (${response.status}): ${errorText || response.statusText}`);
  }
}

export async function getTranscriptDownloadUrl(transcriptId: string): Promise<string> {
  const apiKey = getRecallApiKey();
  const baseUrl = getRecallBaseUrl();
  const response = await fetch_with_retry({
    url: `${baseUrl}/transcript/${encodeURIComponent(transcriptId)}/`,
    options: {
      method: "GET",
      headers: {
        Authorization: apiKey,
        Accept: "application/json",
      },
    },
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`Failed to retrieve transcript '${transcriptId}' (${response.status}): ${errorText || response.statusText}`);
  }

  const artifact = (await response.json()) as { data?: { download_url?: unknown } };
  const downloadUrl = artifact.data?.download_url;
  if (typeof downloadUrl !== "string" || !downloadUrl) {
    throw new Error(`Recall transcript '${transcriptId}' did not include a download URL.`);
  }
  return downloadUrl;
}

export interface RawTranscriptWord {
  text: string;
  start_timestamp?: { relative?: number; absolute?: string };
  end_timestamp?: { relative?: number; absolute?: string };
}

export interface RawTranscriptPart {
  participant?: {
    id?: number | string;
    name?: string | null;
  };
  words?: RawTranscriptWord[];
}

export interface ReadableTranscriptEntry {
  speaker: string;
  paragraph: string;
  start_timestamp: { relative: number | null; absolute: string | null };
  end_timestamp: { relative: number | null; absolute: string | null };
  duration_seconds: number | null;
}

/**
 * Converts raw Recall transcript parts into a clean speaker-grouped readable transcript.
 * Implements the official Recall.ai sample algorithm.
 */
export function convert_to_readable_transcript(transcriptParts: RawTranscriptPart[]): ReadableTranscriptEntry[] {
  if (!Array.isArray(transcriptParts)) return [];

  const keepers: RawTranscriptPart[] = [];
  for (const entry of transcriptParts) {
    const participant = entry?.participant;
    const words = Array.isArray(entry?.words) ? entry.words : [];
    if (!participant?.name || words.length === 0) continue;

    const key = participant.id ?? participant.name;
    const last = keepers[keepers.length - 1];
    const lastKey = last && (last.participant?.id ?? last.participant?.name);

    if (last && key === lastKey && last.words) {
      last.words.push(...words);
    } else {
      keepers.push({
        participant: entry.participant,
        words: [...words],
      });
    }
  }

  const results: ReadableTranscriptEntry[] = [];
  for (const { participant, words } of keepers) {
    if (!words || words.length === 0) continue;

    const paragraph = words
      .map((w) => w.text)
      .join(" ")
      .trim();
    if (!paragraph) continue;

    const first = words.find((w) => w?.start_timestamp);
    const last = [...words].reverse().find((w) => w?.end_timestamp);

    const start_relative = first?.start_timestamp?.relative ?? null;
    const start_absolute = first?.start_timestamp?.absolute ?? null;
    const end_relative = last?.end_timestamp?.relative ?? null;
    const end_absolute = last?.end_timestamp?.absolute ?? null;

    let duration_seconds: number | null = null;
    if (start_relative !== null && end_relative !== null) {
      duration_seconds = Math.round((end_relative - start_relative) * 1000) / 1000;
    } else if (start_absolute && end_absolute) {
      duration_seconds = Math.round(((Date.parse(end_absolute) - Date.parse(start_absolute)) / 1000) * 1000) / 1000;
    }

    results.push({
      speaker: participant?.name || "Unknown Speaker",
      paragraph,
      start_timestamp: { relative: start_relative, absolute: start_absolute },
      end_timestamp: { relative: end_relative, absolute: end_absolute },
      duration_seconds,
    });
  }

  return results;
}

/**
 * Downloads transcript JSON from a Recall download URL and returns both raw and readable formats.
 */
export async function downloadAndFormatTranscript(downloadUrl: string): Promise<{
  readable: ReadableTranscriptEntry[];
  raw: RawTranscriptPart[];
  fullText: string;
}> {
  const response = await fetch(downloadUrl);
  if (!response.ok) {
    throw new Error(`Failed to download transcript (${response.status}): ${response.statusText}`);
  }

  const raw = (await response.json()) as RawTranscriptPart[];
  const readable = convert_to_readable_transcript(raw);
  const fullText = readable.map((r) => `${r.speaker}: ${r.paragraph}`).join("\n\n");

  return {
    readable,
    raw,
    fullText,
  };
}
