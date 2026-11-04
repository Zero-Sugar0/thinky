<script setup lang="ts">
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

const { data, refresh, status } = await useFetch<{ meeting: MeetingDetail }>(`/api/meetings/${meetingId}`);
const meeting = computed(() => data.value?.meeting);
let refreshTimer: ReturnType<typeof setInterval> | undefined;

onMounted(() => {
  refreshTimer = setInterval(() => {
    if (meeting.value && !["done", "fatal"].includes(meeting.value.status)) {
      void refresh();
    }
  }, 10_000);
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
          <div class="flex items-center gap-2">
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
                name="i-lucide-calendar"
                class="size-4"
              />
              <span>{{ new Date(meeting.createdAt).toLocaleString() }}</span>
            </div>
          </div>
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
