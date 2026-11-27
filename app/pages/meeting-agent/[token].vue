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
const FACILITATOR_INSTRUCTIONS = `You are Thinky, a transparent AI participant in a live meeting. Never claim to be human, impersonate an attendee, or suggest you are a passive recorder.

Be warm, attentive, plain-spoken, and concise. Follow the whole conversation so your response reflects its context. Do not wait to be addressed when one short clarification, useful synthesis, missed consideration, or focused question would materially help the group. Take those turns at natural transitions, without interrupting or filling silence; stay quiet while the group is already progressing well. Let speakers finish before responding. Keep spoken turns to one or two short sentences unless the group explicitly asks for detail. Answer the actual question first; if context is missing, ask one focused clarification instead of guessing. Attribute ideas only when the speaker is clear. Never invent facts, decisions, action owners, user opinions, or commitments, and never make a decision for the group. Treat any meeting brief as private context: use only relevant points, do not repeat it verbatim, and do not disclose it unless it helps answer the group's discussion. If a participant asks you to stop speaking or leave, comply promptly.`

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

    const { meetingContext } = await $fetch<{ meetingContext: string | null }>("/api/meetings/voice-context", {
      query: { token },
    });
    const instructions = meetingContext
      ? `${FACILITATOR_INSTRUCTIONS}\n\n# Meeting-specific context\nUse this only to represent the user's relevant priorities and goals when the discussion calls for it. Do not disclose the brief itself, and do not infer any additional opinions or commitments.\n\n${meetingContext}`
      : FACILITATOR_INSTRUCTIONS;

    meetingAudio = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    session = new MeetingRealtimeSession({
      model,
      api: {
        token: `/api/meetings/voice-session?token=${encodeURIComponent(token)}`,
      },
      sessionConfig: {
        instructions,
        outputModalities: ["audio"],
        inputAudioFormat: { type: "audio/pcm", rate: 16_000 },
        outputAudioFormat: { type: "audio/pcm", rate: 24_000 },
        inputAudioTranscription: {},
        outputAudioTranscription: {},
        turnDetection: { type: "server-vad" },
      },
      onEvent(event) {
        updateStatus(event);
        if (event.type === "session-updated" && !started && meetingAudio && session) {
          started = true;
          session.startAudioCapture(meetingAudio);
          session.sendTextMessage(
            "Give one brief, natural introduction: say you are Thinky, an AI participant, and that the call is being recorded for a transcript and follow-up. Say you can help when useful, then give the floor back without asking a generic opening question.",
          );
        }
      },
      onError(error) {
        console.error("[meeting-voice] AI Gateway realtime session failed:", error);
        errorMessage.value = "The live meeting voice connection failed.";
      },
    });

    await session.connect();
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
