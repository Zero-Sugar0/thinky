import crypto from "node:crypto";
import { Buffer } from "node:buffer";

import { THINKY_MEETING_AVATAR_BASE64 } from "./meeting-avatar.js";

/**
 * Recall.ai client library.
 *
 * Handles bot creation and lifecycle, real-time and async transcription,
 * transcript retrieval, and Recall webhook signature verification.
 */

export type RecallRegion =
  | "us-west-2"
  | "us-east-1"
  | "eu-central-1"
  | "ap-northeast-1";

const RECALL_REGIONS: readonly RecallRegion[] = [
  "us-west-2",
  "us-east-1",
  "eu-central-1",
  "ap-northeast-1",
] as const;

const THINKY_AGENT_PROMPT = [
  "You are Thinky, a transparent AI meeting participant. You are not a human attendee and do not impersonate anyone.",
  "Listen carefully to the full discussion. Speak in natural, concise sentences when directly addressed or when you can materially help with a clarification, synthesis, missed consideration, or focused question.",
  "Do not interrupt; wait for a natural pause. Do not speak just to fill silence. Keep each turn to one or two short sentences unless the group asks for detail.",
  "Answer the question asked. Never invent facts, decisions, owners, deadlines, user opinions, or commitments. Respect requests to stop speaking or leave.",
].join("\n\n");

const DEFAULT_JOIN_MESSAGE =
  "Thinky is an AI participant. This call is being recorded for a transcript and follow-up; I can help with context or next steps when useful.";

const DEFAULT_GREETING =
  "Hi, Thinky here. I’m an AI meeting assistant. This call is being recorded for a transcript and follow-up. I’ll listen and speak when I can help.";

export function getRecallRegion(): RecallRegion {
  const region = (process.env.RECALL_REGION ?? "us-west-2").toLowerCase();

  if (!RECALL_REGIONS.includes(region as RecallRegion)) {
    throw new Error(
      `Invalid RECALL_REGION '${region}'. Supported values: ${RECALL_REGIONS.join(", ")}.`,
    );
  }

  return region as RecallRegion;
}

export function getRecallBaseUrl(): string {
  return `https://${getRecallRegion()}.recall.ai/api/v1`;
}

export function getRecallApiKey(): string {
  const apiKey = process.env.RECALL_API_KEY;

  if (!apiKey) {
    throw new Error("RECALL_API_KEY environment variable is missing.");
  }

  return apiKey;
}

export function getPublicApiBaseUrl(): string | undefined {
  return (
    process.env.PUBLIC_API_BASE_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : undefined) ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined) ??
    process.env.NUXT_PUBLIC_SITE_URL ??
    undefined
  );
}

/**
 * Performs a fetch request with retries for transient Recall.ai failures.
 *
 * Retries:
 * - 429: honors Retry-After, with jitter
 * - 503: temporary outage
 * - 507: bot pool capacity exhausted
 */
export async function fetchWithRetry({
  url,
  options,
  maxAttempts = 6,
}: {
  url: string;
  options: RequestInit;
  maxAttempts?: number;
}): Promise<Response> {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const response = await fetch(url, options);

    const retryDelaySeconds = getRetryDelaySeconds(response);

    if (retryDelaySeconds === null || attempt === maxAttempts) {
      return response;
    }

    const jitterMs = Math.ceil(Math.random() * 5) * 1000;

    await sleep(retryDelaySeconds * 1000 + jitterMs);
  }

  throw new Error(`Max attempts (${maxAttempts}) reached while fetching ${url}`);
}

function getRetryDelaySeconds(response: Response): number | null {
  switch (response.status) {
    case 429: {
      const retryAfter = response.headers.get("Retry-After");
      const parsed = retryAfter ? Number.parseInt(retryAfter, 10) : NaN;
      return Number.isFinite(parsed) ? parsed : 5;
    }
    case 503:
      return 10;
    case 507:
      return 30;
    default:
      return null;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Verifies that a Recall webhook, websocket callback, or API callback was sent by Recall.ai.
 *
 * Uses HMAC-SHA-256 and a constant-time signature comparison.
 */
export function verifyRequestFromRecall({
  secret,
  headers,
  payload,
}: {
  secret: string;
  headers: Record<string, string>;
  payload: string | Buffer | null;
}): void {
  const messageId = headers["webhook-id"] ?? headers["svix-id"];
  const timestamp = headers["webhook-timestamp"] ?? headers["svix-timestamp"];
  const signatureHeader = headers["webhook-signature"] ?? headers["svix-signature"];

  if (!secret || (!secret.startsWith("whsec_") && secret.length < 16)) {
    throw new Error("Verification secret is missing or invalid.");
  }

  if (!messageId || !timestamp || !signatureHeader) {
    throw new Error(
      `Missing webhook ID (${messageId}), timestamp (${timestamp}), or signature (${signatureHeader}).`,
    );
  }

  const secretPrefix = "whsec_";
  const encodedSecret = secret.startsWith(secretPrefix)
    ? secret.slice(secretPrefix.length)
    : secret;

  const signingKey = Buffer.from(encodedSecret, "base64");
  const payloadString = normalizePayload(payload);
  const signedContent = `${messageId}.${timestamp}.${payloadString}`;

  const expectedSignature = crypto
    .createHmac("sha256", signingKey)
    .update(signedContent)
    .digest("base64");

  const signatures = signatureHeader.split(" ");

  for (const versionedSignature of signatures) {
    const [version, signature] = versionedSignature.split(",");

    if (version !== "v1" || !signature) {
      continue;
    }

    if (isSafeSignatureMatch(signature, expectedSignature)) {
      return;
    }
  }

  throw new Error("No matching Recall signature found.");
}

function normalizePayload(payload: string | Buffer | null): string {
  if (!payload) return "";

  if (Buffer.isBuffer(payload)) {
    return payload.toString("utf8");
  }

  return payload;
}

function isSafeSignatureMatch(
  receivedSignature: string,
  expectedSignature: string,
): boolean {
  const receivedBytes = Buffer.from(receivedSignature, "base64");
  const expectedBytes = Buffer.from(expectedSignature, "base64");

  if (receivedBytes.length !== expectedBytes.length) {
    return false;
  }

  return crypto.timingSafeEqual(
    new Uint8Array(receivedBytes),
    new Uint8Array(expectedBytes),
  );
}

export interface CreateBotOptions {
  meetingUrl: string;
  botName?: string;
  joinAt?: string;
  joinMessage?: string;
  meetingContext?: string;
  enableRealtimeTranscript?: boolean;
  bridgeToken?: string;
  /** Company and business context from COMPANY.md and BUSINESS.md. */
  briefing?: string;
}

export interface BotStatusChange {
  code: string;
  created_at: string;
  message?: string;
}

export interface BotRecordingTranscript {
  id: string;
  data?: {
    download_url?: string;
  };
}

export interface BotRecording {
  id: string;
  media_shortcuts?: {
    transcript?: BotRecordingTranscript;
  };
}

export interface BotInstance {
  id: string;
  meeting_url: string;
  bot_name?: string;
  join_at?: string;
  status_changes?: BotStatusChange[];
  recordings?: BotRecording[];
  [key: string]: unknown;
}

/**
 * Creates and schedules a Recall.ai meeting bot.
 */
export async function createMeetingBot(
  options: CreateBotOptions,
): Promise<BotInstance> {
  const apiKey = getRecallApiKey();
  const baseUrl = getRecallBaseUrl();
  const publicBaseUrl = getPublicApiBaseUrl();

  validateMeetingUrl(options.meetingUrl);
  validatePublicBaseUrl(publicBaseUrl);

  const payload = buildCreateBotPayload(options, new URL(publicBaseUrl!));

  const response = await fetchWithRetry({
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

    throw new RecallApiError(
      `Failed to create meeting bot.`,
      response.status,
      errorText,
    );
  }

  return (await response.json()) as BotInstance;
}

function buildCreateBotPayload(
  options: CreateBotOptions,
  publicUrl: URL,
): Record<string, unknown> {
  const botName = options.botName ?? "Thinky";
  const joinAt = options.joinAt ?? new Date().toISOString();

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

  return {
    meeting_url: options.meetingUrl,
    join_at: joinAt,
    bot_name: botName,
    variant: {
      zoom: "web_4_core",
      google_meet: "web_4_core",
      microsoft_teams: "web_4_core",
      webex: "web_4_core",
    },
    recording_config: recordingConfig,
    automatic_video_output: {
      in_call_not_recording: {
        kind: "jpeg",
        b64_data: THINKY_MEETING_AVATAR_BASE64,
      },
      in_call_recording: {
        kind: "jpeg",
        b64_data: THINKY_MEETING_AVATAR_BASE64,
      },
    },
    output_media: {
      audio: {
        kind: "deepgram",
        config: {
          agent: {
            language: "en",
            listen: {
              provider: {
                type: "deepgram",
                model: "nova-3",
              },
            },
            think: {
              provider: {
                type: "open_ai",
                model: "gpt-5-mini",
              },
              prompt: buildThinkyPrompt(options.meetingContext, options.briefing),
              functions: options.bridgeToken
                ? buildBridgeFunctions(publicUrl.origin, options.bridgeToken)
                : [],
            },
            speak: {
              provider: {
                type: "deepgram",
                version: "v2",
                model: "flux-alexis-en",
                speed: 1.05,
                expressivity: 1,
              },
            },
            greeting: DEFAULT_GREETING,
          },
        },
      },
    },
    chat: {
      on_bot_join: {
        send_to: "everyone",
        message: options.joinMessage ?? DEFAULT_JOIN_MESSAGE,
        pin: true,
      },
    },
  };
}

/**
 * Briefing for the voice agent. It includes company facts and business tone, but
 * never the owner's personal memory, which can reach a room of other people.
 */
const MEETING_TOOLS_PROMPT = [
  "You can act in this meeting through tools. Use ask_thinky for anything that needs records, memory, tasks, research, or other systems; it returns the answer for you to say. Use send_chat to post links or written details people should keep. Use share_screen only for a public https page the participants asked to see, and stop_share when they are done with it. Use leave_meeting only when the host asks you to leave.",
  "Say briefly what you are doing before a tool call that takes time. Keep spoken answers short and never claim an action happened unless its tool returned success.",
].join("\n\n");

function buildThinkyPrompt(meetingContext?: string, briefing?: string): string {
  const sections = [THINKY_AGENT_PROMPT];
  if (briefing?.trim()) {
    sections.push(
      `Company and business context. Use it for facts and tone; do not recite it unprompted:\n${briefing.trim()}`,
    );
  }
  sections.push(MEETING_TOOLS_PROMPT);

  const context = meetingContext?.trim();
  if (context) {
    sections.push(
      `Private meeting context, only to inform relevant answers; do not recite or disclose it unnecessarily:\n${context}`,
    );
  }

  return sections.join("\n\n");
}

/**
 * Tools the voice agent can call during the call. Deepgram posts each call to the
 * bridge endpoint with this meeting's bridge token.
 */
export const MEETING_BRIDGE_TOOLS = {
  ask_thinky: {
    description:
      "Ask Thinky, the owner's full assistant, to do anything beyond talking: look up records, save or update tasks, check the owner's notes and preferences, research, or use connected apps. Pass the request in plain words, with any names, dates, and numbers from the conversation. Returns Thinky's answer to say aloud.",
    properties: {
      request: { type: "string", description: "What to do or find, in plain words." },
    },
    required: ["request"],
  },
  send_chat: {
    description: "Post a message to the meeting chat, for links or details people should keep.",
    properties: {
      message: { type: "string", description: "The chat message to post." },
    },
    required: ["message"],
  },
  share_screen: {
    description: "Share a public https webpage in the meeting when participants ask to see it.",
    properties: {
      url: { type: "string", description: "A public https:// URL to share." },
    },
    required: ["url"],
  },
  stop_share: {
    description: "Stop sharing the webpage. Use when the participants are done with it.",
    properties: {},
    required: [],
  },
  leave_meeting: {
    description: "Leave the meeting. Use only when the host asks Thinky to leave.",
    properties: {},
    required: [],
  },
} as const;

function buildBridgeFunctions(baseUrl: string, bridgeToken: string): Array<Record<string, unknown>> {
  return Object.entries(MEETING_BRIDGE_TOOLS).map(([name, tool]) => ({
    name,
    description: tool.description,
    parameters: {
      type: "object",
      properties: tool.properties,
      required: tool.required,
    },
    endpoint: {
      url: `${baseUrl}/api/meetings/bridge/${name}`,
      method: "POST",
      headers: [{ key: "authorization", value: `Bearer ${bridgeToken}` }],
    },
  }));
}

function validateMeetingUrl(meetingUrl: string): void {
  if (
    meetingUrl.includes("localhost") ||
    meetingUrl.includes("127.0.0.1")
  ) {
    throw new Error(
      "Recall.ai does not permit 'localhost' or IP addresses in meeting URLs.",
    );
  }
}

function validatePublicBaseUrl(publicBaseUrl?: string): void {
  if (!publicBaseUrl) {
    throw new Error(
      "PUBLIC_API_BASE_URL is required for Recall meeting transcript callbacks.",
    );
  }

  const publicUrl = new URL(publicBaseUrl);

  const isLocalhost =
    publicUrl.hostname === "localhost" ||
    publicUrl.hostname.endsWith(".localhost");

  if (publicUrl.protocol !== "https:" || isLocalhost) {
    throw new Error(
      "PUBLIC_API_BASE_URL must be a publicly reachable HTTPS URL for Recall meeting callbacks.",
    );
  }
}

/**
 * Retrieves a bot instance by bot ID.
 */
export async function getMeetingBot(botId: string): Promise<BotInstance> {
  const response = await recallRequest({
    method: "GET",
    path: `/bot/${encodeURIComponent(botId)}/`,
    errorContext: `Failed to retrieve bot '${botId}'.`,
  });

  return (await response.json()) as BotInstance;
}

/**
 * Removes a bot from an active meeting call.
 */
export async function leaveMeetingBot(botId: string): Promise<void> {
  await recallRequest({
    method: "POST",
    path: `/bot/${encodeURIComponent(botId)}/leave_call/`,
    errorContext: "Failed to remove bot from call.",
  });
}

/**
 * Requests an asynchronous post-meeting transcript for a recording.
 */
export async function createAsyncTranscript(
  recordingId: string,
): Promise<void> {
  await recallRequest({
    method: "POST",
    path: `/recording/${encodeURIComponent(recordingId)}/create_transcript/`,
    errorContext: "Failed to create async transcript.",
    body: {
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
    },
  });
}

export async function getTranscriptDownloadUrl(
  transcriptId: string,
): Promise<string> {
  const response = await recallRequest({
    method: "GET",
    path: `/transcript/${encodeURIComponent(transcriptId)}/`,
    errorContext: `Failed to retrieve transcript '${transcriptId}'.`,
  });

  const artifact = (await response.json()) as {
    data?: {
      download_url?: unknown;
    };
  };

  const downloadUrl = artifact.data?.download_url;

  if (typeof downloadUrl !== "string" || !downloadUrl) {
    throw new Error(
      `Recall transcript '${transcriptId}' did not include a download URL.`,
    );
  }

  return downloadUrl;
}

async function recallRequest({
  method,
  path,
  errorContext,
  body,
}: {
  method: "GET" | "POST" | "DELETE";
  path: string;
  errorContext: string;
  body?: unknown;
}): Promise<Response> {
  const response = await fetchWithRetry({
    url: `${getRecallBaseUrl()}${path}`,
    options: {
      method,
      headers: {
        Authorization: getRecallApiKey(),
        Accept: "application/json",
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    },
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");

    throw new RecallApiError(errorContext, response.status, errorText);
  }

  return response;
}

export class RecallApiError extends Error {
  readonly status: number;
  readonly responseBody: string;

  constructor(message: string, status: number, responseBody = "") {
    const details = responseBody || "No response body";

    super(`${message} (${status}): ${details}`);

    this.name = "RecallApiError";
    this.status = status;
    this.responseBody = responseBody;
  }
}

export interface RawTranscriptWord {
  text: string;
  start_timestamp?: {
    relative?: number;
    absolute?: string;
  };
  end_timestamp?: {
    relative?: number;
    absolute?: string;
  };
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
  start_timestamp: {
    relative: number | null;
    absolute: string | null;
  };
  end_timestamp: {
    relative: number | null;
    absolute: string | null;
  };
  duration_seconds: number | null;
}

/**
 * Converts raw Recall transcript parts into clean, speaker-grouped transcript entries.
 */
export function convertToReadableTranscript(
  transcriptParts: RawTranscriptPart[],
): ReadableTranscriptEntry[] {
  if (!Array.isArray(transcriptParts)) {
    return [];
  }

  const groupedParts = groupConsecutiveSpeakerParts(transcriptParts);

  return groupedParts
    .map(createReadableEntry)
    .filter((entry): entry is ReadableTranscriptEntry => entry !== null);
}

function groupConsecutiveSpeakerParts(
  transcriptParts: RawTranscriptPart[],
): RawTranscriptPart[] {
  const grouped: RawTranscriptPart[] = [];

  for (const part of transcriptParts) {
    const participant = part?.participant;
    const words = Array.isArray(part?.words) ? part.words : [];

    if (!participant?.name || words.length === 0) {
      continue;
    }

    const speakerKey = participant.id ?? participant.name;
    const previous = grouped.at(-1);
    const previousSpeakerKey =
      previous?.participant?.id ?? previous?.participant?.name;

    if (previous && speakerKey === previousSpeakerKey && previous.words) {
      previous.words.push(...words);
    } else {
      grouped.push({
        participant,
        words: [...words],
      });
    }
  }

  return grouped;
}

function createReadableEntry({
  participant,
  words,
}: RawTranscriptPart): ReadableTranscriptEntry | null {
  if (!words?.length) {
    return null;
  }

  const paragraph = words
    .map((word) => word.text)
    .join(" ")
    .trim();

  if (!paragraph) {
    return null;
  }

  const firstWord = words.find((word) => word?.start_timestamp);
  const lastWord = [...words].reverse().find((word) => word?.end_timestamp);

  const startRelative = firstWord?.start_timestamp?.relative ?? null;
  const startAbsolute = firstWord?.start_timestamp?.absolute ?? null;
  const endRelative = lastWord?.end_timestamp?.relative ?? null;
  const endAbsolute = lastWord?.end_timestamp?.absolute ?? null;

  return {
    speaker: participant?.name ?? "Unknown Speaker",
    paragraph,
    start_timestamp: {
      relative: startRelative,
      absolute: startAbsolute,
    },
    end_timestamp: {
      relative: endRelative,
      absolute: endAbsolute,
    },
    duration_seconds: calculateDurationSeconds(
      startRelative,
      endRelative,
      startAbsolute,
      endAbsolute,
    ),
  };
}

function calculateDurationSeconds(
  startRelative: number | null,
  endRelative: number | null,
  startAbsolute: string | null,
  endAbsolute: string | null,
): number | null {
  if (startRelative !== null && endRelative !== null) {
    return roundToThreeDecimals(endRelative - startRelative);
  }

  if (startAbsolute && endAbsolute) {
    const startTime = Date.parse(startAbsolute);
    const endTime = Date.parse(endAbsolute);

    if (
      Number.isNaN(startTime) ||
      Number.isNaN(endTime) ||
      endTime < startTime
    ) {
      return null;
    }

    return roundToThreeDecimals((endTime - startTime) / 1000);
  }

  return null;
}

function roundToThreeDecimals(value: number): number {
  return Math.round(value * 1000) / 1000;
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
    throw new Error(
      `Failed to download transcript (${response.status}): ${response.statusText}`,
    );
  }

  const raw = (await response.json()) as RawTranscriptPart[];
  const readable = convertToReadableTranscript(raw);
  const fullText = readable
    .map((entry) => `${entry.speaker}: ${entry.paragraph}`)
    .join("\n\n");

  return {
    readable,
    raw,
    fullText,
  };
}

/**
 * Posts a chat message into the meeting as the bot.
 */
export async function sendChatMessage(botId: string, message: string): Promise<void> {
  await recallRequest({
    method: "POST",
    path: `/bot/${encodeURIComponent(botId)}/send_chat_message/`,
    errorContext: "Failed to send chat message.",
    body: { to: "everyone", message },
  });
}

/**
 * Shares a webpage as the bot's screenshare. It shows rendered page content,
 * never a participant's desktop.
 */
export async function startScreenshare(botId: string, url: string): Promise<void> {
  await recallRequest({
    method: "POST",
    path: `/bot/${encodeURIComponent(botId)}/output_media/`,
    errorContext: "Failed to start screenshare.",
    body: { screenshare: { kind: "webpage", config: { url } } },
  });
}

/**
 * Stops only the screenshare, leaving the bot's camera avatar running.
 */
export async function stopScreenshare(botId: string): Promise<void> {
  await recallRequest({
    method: "DELETE",
    path: `/bot/${encodeURIComponent(botId)}/output_media/`,
    errorContext: "Failed to stop screenshare.",
    body: { screenshare: true },
  });
}
