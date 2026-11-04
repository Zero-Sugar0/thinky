<script setup lang="ts">
import {
  Experimental_AbstractRealtimeSession,
  gateway,
  type Experimental_RealtimeState,
  type Experimental_RealtimeStatus,
} from "ai";

definePageMeta({ layout: false });

const route = useRoute();
const status = ref("Connecting to the meeting...");
const errorMessage = ref("");
const sessionStatus = ref<Experimental_RealtimeStatus>("disconnected");

const GEMINI_LIVE_MODEL = "google/gemini-3.8-live";
const FACILITATOR_INSTRUCTIONS = `You are Thinky, a transparent AI meeting facilitator participating in a live meeting.

You are an AI participant, not a human and not a notetaker. Be warm, neutral, concise, and collaborative. Listen to the full group conversation. Speak clearly when someone addresses Thinky, asks for help, or when a concise clarification or summary would materially help the group. After the opening introduction, actively participate when the group asks a question or reaches a decision point; do not remain silent if a direct response is expected. Stay silent during ordinary participant-to-participant conversation and do not fill pauses. Do not speak over participants. Never invent meeting facts or make decisions on behalf of the group.`;

let meetingAudio: MediaStream | undefined;
let session: MeetingRealtimeSession | undefined;
let started = false;

const model = gateway.experimental_realtime(GEMINI_LIVE_MODEL);

class MeetingRealtimeSession extends Experimental_AbstractRealtimeSession {
  protected setState<K extends keyof Experimental_RealtimeState>(
    _key: K,
    _value: Experimental_RealtimeState[K],
  ): void {
    sessionStatus.value = this.state.status;
  }
}

function getToken(): string {
  const token = route.params.token;
  return typeof token === "string" ? token : "";
}

function updateStatus(event: {
  type: string;
  delta?: string;
  transcript?: string;
}) {
  if (event.type === "speech-started") {
    status.value = "A participant is speaking...";
  } else if (event.type === "audio-transcript-delta" || event.type === "text-delta") {
    status.value = "Thinky is responding...";
  } else if (event.type === "response-done") {
    status.value = "Thinky is listening and ready to participate.";
  } else if (event.type === "session-updated") {
    status.value = "Thinky is ready to join the conversation.";
  } else if (event.type === "input-transcription-completed") {
    status.value = "Listening to the group...";
  }
}

async function connectToMeeting() {
  try {
    const token = getToken();
    if (!token) throw new Error("Meeting voice session token is missing.");

    meetingAudio = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    session = new MeetingRealtimeSession({
      model,
      api: {
        token: `/api/meetings/voice-session?token=${encodeURIComponent(token)}`,
      },
      sessionConfig: {
        instructions: FACILITATOR_INSTRUCTIONS,
        outputModalities: ["audio"],
        inputAudioFormat: { type: "audio/pcm", rate: 16_000 },
        outputAudioFormat: { type: "audio/pcm", rate: 24_000 },
        inputAudioTranscription: {},
        outputAudioTranscription: {},
        turnDetection: { type: "server-vad" },
      },
      onEvent(event) {
        updateStatus(event);
        if (
          (event.type === "session-created" || event.type === "session-updated")
          && !started
          && meetingAudio
          && session
        ) {
          started = true;
          session.startAudioCapture(meetingAudio);
          session.sendTextMessage(
            "Introduce yourself briefly as Thinky, the AI meeting facilitator. Say you will help when useful, then ask what the group would like to accomplish.",
          );
        }
      },
      onError(error) {
        console.error("[meeting-voice] AI Gateway realtime session failed:", error);
        errorMessage.value = "The live meeting voice connection failed.";
      },
    });

    await session.connect();

    // Do not depend on a provider event race: start the microphone capture and
    // first spoken turn as soon as the realtime connection is ready.
    if (!started && meetingAudio) {
      started = true;
      session.startAudioCapture(meetingAudio);
      session.sendTextMessage(
        "Introduce yourself briefly as Thinky, the AI meeting facilitator. Say you will help when useful, then ask what the group would like to accomplish.",
      );
    }
  } catch (error) {
    console.error("[meeting-voice] Could not start facilitator:", error);
    meetingAudio?.getTracks().forEach((track) => track.stop());
    errorMessage.value = error instanceof Error ? error.message : "Could not start the meeting facilitator.";
  }
}

watch(sessionStatus, (value) => {
  if (value === "error") {
    errorMessage.value = "The live meeting voice connection failed.";
  }
});

onMounted(() => {
  void connectToMeeting();
});

onBeforeUnmount(() => {
  session?.dispose();
  meetingAudio?.getTracks().forEach((track) => track.stop());
});
</script>

<template>
  <main class="min-h-screen bg-neutral-950 p-6 text-neutral-100">
    <div class="mx-auto max-w-lg space-y-3 pt-12 text-center">
      <h1 class="text-xl font-semibold">
        Thinky AI Meeting Facilitator
      </h1>
      <p
        class="text-sm text-neutral-300"
        role="status"
        aria-live="polite"
      >
        {{ errorMessage || status }}
      </p>
    </div>
  </main>
</template>
