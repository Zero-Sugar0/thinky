<script setup lang="ts">
import { MEETING_VOICES } from "~~/shared/meeting-voices";

interface TranscriptEntry {
  speaker: string;
  paragraph: string;
  duration_seconds?: number | null;
  start_timestamp?: { relative?: number | null; absolute?: string | null };
}

interface MeetingDetail {
  id: string;
  meetingUrl: string;
  title: string;
  botName: string;
  voice: string;
  status: string;
  recordingId: string | null;
  transcriptId: string | null;
  transcriptText: string | null;
  transcriptData: TranscriptEntry[] | null;
  summary: string | null;
  createdAt: string;
}

const route = useRoute();
const meetingId = route.params.id as string;

interface ActivityEntry {
  id: string;
  kind: string;
  title: string;
  detail: string | null;
  createdAt: string;
}

const { data, refresh, status } = await useFetch<{ meeting: MeetingDetail }>(`/api/meetings/${meetingId}`);
const meeting = computed(() => data.value?.meeting);
const { data: activityData, refresh: refreshActivity } = await useFetch<{ activity: ActivityEntry[] }>(
  `/api/meetings/${meetingId}/activity`,
);
const activity = computed(() => activityData.value?.activity ?? []);
const voiceName = computed(() => {
  const id = meeting.value?.voice ?? "";
  return MEETING_VOICES.find(voice => voice.id === id)?.name ?? id;
});
const isLive = computed(() => !!meeting.value && !["done", "fatal"].includes(meeting.value.status));

const activityIcons: Record<string, string> = {
  status: "i-lucide-radio",
  request: "i-lucide-message-circle-question",
  answer: "i-lucide-message-square-text",
  note: "i-lucide-notebook-pen",
  chat: "i-lucide-message-square",
  screenshare: "i-lucide-monitor",
  system: "i-lucide-info",
};

let refreshTimer: ReturnType<typeof setInterval> | undefined;

onMounted(() => {
  refreshTimer = setInterval(() => {
    if (isLive.value) {
      void refresh();
      void refreshActivity();
    }
  }, 5_000);
});

onBeforeUnmount(() => {
  if (refreshTimer) clearInterval(refreshTimer);
});
</script>

<template>
  <UDashboardPanel
    id="meeting-detail"
    class="min-h-0 flex-1"
  >
    <template #header>
      <UDashboardNavbar>
        <template #left>
          <div class="flex min-w-0 items-center gap-2">
            <UButton
              to="/meetings"
              icon="i-lucide-arrow-left"
              variant="ghost"
              color="neutral"
              size="sm"
            />
            <span class="font-medium text-highlighted truncate">
              {{ meeting?.title || "Meeting Detail" }}
            </span>
          </div>
        </template>
        <template #right>
          <UButton
            icon="i-lucide-refresh-cw"
            variant="ghost"
            color="neutral"
            size="sm"
            :loading="status === 'pending'"
            @click="refresh()"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div
        v-if="meeting"
        class="p-3 sm:p-6 space-y-4 sm:space-y-6 max-w-4xl mx-auto pt-[calc(var(--ui-header-height,3.5rem)+1rem)] sm:pt-6"
      >
        <!-- Header Info Card -->
        <div class="rounded-xl border border-default/70 bg-elevated/40 p-4 sm:p-5 space-y-2.5">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <h1 class="text-base sm:text-lg font-semibold text-highlighted">
              {{ meeting.title || "Untitled Meeting" }}
            </h1>
            <UBadge
              color="primary"
              variant="subtle"
              size="xs"
            >
              {{ meeting.status }}
            </UBadge>
          </div>

          <div class="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted">
            <div class="flex items-center gap-1.5">
              <UIcon
                name="i-lucide-link"
                class="size-4"
              />
              <a
                :href="meeting.meetingUrl"
                target="_blank"
                rel="noreferrer"
                class="hover:underline truncate max-w-xs"
              >
                {{ meeting.meetingUrl }}
              </a>
            </div>
            <div class="flex items-center gap-1.5">
              <UIcon
                name="i-lucide-bot"
                class="size-4"
              />
              <span>{{ meeting.botName }}</span>
            </div>
            <div class="flex items-center gap-1.5">
              <UIcon
                name="i-lucide-audio-lines"
                class="size-4"
              />
              <span>{{ voiceName }} voice</span>
            </div>
            <div class="flex items-center gap-1.5">
              <UIcon
                name="i-lucide-calendar"
                class="size-4"
              />
              <span>{{ new Date(meeting.createdAt).toLocaleString() }}</span>
            </div>
          </div>
        </div>

        <!-- Activity Section -->
        <div class="space-y-3 sm:space-y-4">
          <div class="flex items-center justify-between">
            <h2 class="text-sm sm:text-base font-semibold text-highlighted flex items-center gap-1.5">
              <UIcon
                name="i-lucide-activity"
                class="size-4 sm:size-5 text-primary"
              />
              Activity
            </h2>
            <UBadge
              :color="isLive ? 'success' : 'neutral'"
              variant="subtle"
              size="xs"
            >
              {{ isLive ? "Live" : "Completed" }}
            </UBadge>
          </div>

          <div
            v-if="!activity.length"
            class="rounded-xl border border-default/60 p-6 text-center text-sm text-muted"
          >
            {{ isLive ? "Waiting for the bot to join. Activity appears here as it happens." : "No activity was recorded for this meeting." }}
          </div>

          <ol
            v-else
            class="space-y-2"
          >
            <li
              v-for="entry in activity"
              :key="entry.id"
              class="flex gap-3 rounded-lg border border-default/50 bg-elevated/20 p-3"
            >
              <UIcon
                :name="activityIcons[entry.kind] ?? 'i-lucide-circle'"
                class="size-4 mt-0.5 text-primary shrink-0"
              />
              <div class="min-w-0 flex-1 space-y-0.5">
                <div class="flex items-center justify-between gap-2">
                  <span class="text-sm font-medium text-highlighted">{{ entry.title }}</span>
                  <span class="text-[11px] text-muted font-mono shrink-0">
                    {{ new Date(entry.createdAt).toLocaleTimeString() }}
                  </span>
                </div>
                <p
                  v-if="entry.detail"
                  class="text-xs text-muted whitespace-pre-wrap break-words"
                >
                  {{ entry.detail }}
                </p>
              </div>
            </li>
          </ol>
        </div>

        <!-- Transcript Section -->
        <div class="space-y-3 sm:space-y-4">
          <div class="flex items-center justify-between">
            <h2 class="text-sm sm:text-base font-semibold text-highlighted flex items-center gap-1.5">
              <UIcon
                name="i-lucide-file-text"
                class="size-4 sm:size-5 text-primary"
              />
              Diarized Speaker Transcript
            </h2>
          </div>

          <div
            v-if="!meeting.transcriptData?.length && !meeting.transcriptText"
            class="rounded-xl border border-default/60 p-8 text-center text-muted"
          >
            <UIcon
              name="i-lucide-clock"
              class="size-8 mx-auto mb-2 text-muted"
            />
            <p class="text-sm">
              Transcript is processing or not ready yet. Check back once the meeting concludes.
            </p>
          </div>

          <div
            v-else-if="meeting.transcriptData?.length"
            class="space-y-4"
          >
            <div
              v-for="(item, idx) in meeting.transcriptData"
              :key="idx"
              class="rounded-lg border border-default/50 bg-elevated/20 p-4 space-y-1.5"
            >
              <div class="flex items-center justify-between">
                <span class="text-xs font-semibold text-primary">
                  {{ item.speaker }}
                </span>
                <span
                  v-if="item.start_timestamp?.relative !== undefined"
                  class="text-[11px] text-muted font-mono"
                >
                  {{ Math.floor((item.start_timestamp?.relative || 0) / 60) }}:{{ String(Math.floor((item.start_timestamp?.relative || 0) % 60)).padStart(2, '0') }}
                </span>
              </div>
              <p class="text-sm text-default leading-relaxed">
                {{ item.paragraph }}
              </p>
            </div>
          </div>

          <div
            v-else
            class="rounded-lg border border-default/60 bg-elevated/20 p-4 text-sm whitespace-pre-wrap leading-relaxed"
          >
            {{ meeting.transcriptText }}
          </div>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
