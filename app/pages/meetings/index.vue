<script setup lang="ts">
interface Meeting {
  id: string;
  meetingUrl: string;
  title: string;
  botName: string;
  status: string;
  recordingId: string | null;
  transcriptId: string | null;
  transcriptText: string | null;
  summary: string | null;
  createdAt: string;
}

const { data, status, refresh } = await useFetch<{ meetings: Meeting[] }>("/api/meetings");

const isModalOpen = ref(false);
const submitting = ref(false);
const formError = ref<string | null>(null);

const newMeeting = reactive({
  meetingUrl: "",
  title: "",
  botName: "Thinky Assistant",
  joinMessage: "Thinky Assistant has joined to take notes.",
});

async function handleCreateMeeting() {
  if (!newMeeting.meetingUrl) return;
  submitting.value = true;
  formError.value = null;

  try {
    await $fetch("/api/meetings", {
      method: "POST",
      body: newMeeting,
    });
    newMeeting.meetingUrl = "";
    newMeeting.title = "";
    isModalOpen.value = false;
    await refresh();
  } catch (err: unknown) {
    const fetchErr = err as { data?: { statusMessage?: string; message?: string }; message?: string };
    formError.value = fetchErr.data?.statusMessage || fetchErr.data?.message || fetchErr.message || "Failed to schedule bot";
  } finally {
    submitting.value = false;
  }
}

function getStatusBadgeColor(st: string) {
  switch (st) {
    case "done":
      return "success";
    case "recording_done":
    case "in_call_recording":
      return "info";
    case "in_waiting_room":
    case "joining_call":
    case "scheduled":
      return "warning";
    case "fatal":
      return "error";
    default:
      return "neutral";
  }
}
</script>

<template>
  <UDashboardPanel
    id="meetings"
    class="min-h-0 flex-1"
  >
    <template #header>
      <UDashboardNavbar title="Meetings">
        <template #right>
          <UButton
            icon="i-lucide-video"
            label="Send Bot to Meeting"
            color="primary"
            size="sm"
            @click="isModalOpen = true"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="p-3 sm:p-6 space-y-4 sm:space-y-6 max-w-4xl mx-auto pt-[calc(var(--ui-header-height,3.5rem)+1rem)] sm:pt-6">
        <div class="flex items-center justify-between gap-2">
          <div>
            <h1 class="text-lg sm:text-xl font-semibold text-highlighted">
              Meeting Notetaker
            </h1>
            <p class="text-xs sm:text-sm text-muted">
              AI meeting bot calls, recordings, and speaker-attributed transcripts.
            </p>
          </div>
          <UButton
            icon="i-lucide-refresh-cw"
            variant="ghost"
            color="neutral"
            size="sm"
            :loading="status === 'pending'"
            @click="refresh()"
          />
        </div>

        <!-- Meeting Creation Modal -->
        <UModal
          v-model:open="isModalOpen"
          title="Send Bot to Meeting"
          description="Send Thinky's bot to a Google Meet, Zoom, Teams, or Webex call."
        >
          <template #body>
            <form
              class="space-y-4"
              @submit.prevent="handleCreateMeeting"
            >
              <div
                v-if="formError"
                class="rounded-lg bg-error-50 dark:bg-error-950/50 p-3 text-sm text-error-600 dark:text-error-400"
              >
                {{ formError }}
              </div>

              <div>
                <label class="block text-sm font-medium mb-1">Meeting URL</label>
                <UInput
                  v-model="newMeeting.meetingUrl"
                  placeholder="https://meet.google.com/xyz-abcd-efg"
                  required
                />
              </div>

              <div>
                <label class="block text-sm font-medium mb-1">Title (optional)</label>
                <UInput
                  v-model="newMeeting.title"
                  placeholder="Q2 Sales Sync"
                />
              </div>

              <div>
                <label class="block text-sm font-medium mb-1">Bot Name</label>
                <UInput
                  v-model="newMeeting.botName"
                  placeholder="Thinky Assistant"
                />
              </div>

              <div>
                <label class="block text-sm font-medium mb-1">In-Call Join Announcement</label>
                <UInput
                  v-model="newMeeting.joinMessage"
                  placeholder="Thinky Assistant has joined to take notes."
                />
              </div>

              <div class="flex justify-end gap-2 pt-2">
                <UButton
                  variant="outline"
                  color="neutral"
                  label="Cancel"
                  @click="isModalOpen = false"
                />
                <UButton
                  type="submit"
                  color="primary"
                  label="Join Meeting"
                  :loading="submitting"
                />
              </div>
            </form>
          </template>
        </UModal>

        <!-- Meeting List -->
        <div
          v-if="!data?.meetings?.length"
          class="rounded-xl border border-default/60 p-12 text-center"
        >
          <UIcon
            name="i-lucide-video-off"
            class="size-10 mx-auto text-muted mb-3"
          />
          <h3 class="text-base font-semibold text-highlighted">
            No meetings recorded yet
          </h3>
          <p class="text-sm text-muted mt-1 max-w-sm mx-auto">
            Send Thinky to a Google Meet, Zoom, or Teams call to capture transcripts and notes.
          </p>
          <UButton
            class="mt-4"
            icon="i-lucide-circle-plus"
            label="Schedule First Bot"
            size="sm"
            color="primary"
            @click="isModalOpen = true"
          />
        </div>

        <div
          v-else
          class="space-y-3"
        >
          <NuxtLink
            v-for="m in data.meetings"
            :key="m.id"
            :to="`/meetings/${m.id}`"
            class="block rounded-xl border border-default/70 bg-elevated/40 p-4 transition-colors hover:border-primary/50 hover:bg-elevated/70"
          >
            <div class="flex items-start justify-between gap-4">
              <div class="space-y-1 min-w-0">
                <div class="flex items-center gap-2">
                  <h3 class="text-base font-medium text-highlighted truncate">
                    {{ m.title || "Untitled Meeting" }}
                  </h3>
                  <UBadge
                    :color="getStatusBadgeColor(m.status)"
                    size="xs"
                    variant="subtle"
                  >
                    {{ m.status }}
                  </UBadge>
                </div>
                <p class="text-xs text-muted truncate">
                  {{ m.meetingUrl }}
                </p>
              </div>

              <span class="text-xs text-muted shrink-0">
                {{ new Date(m.createdAt).toLocaleDateString() }}
              </span>
            </div>

            <div
              v-if="m.transcriptText"
              class="mt-3 text-xs text-muted line-clamp-2 border-t border-default/40 pt-2"
            >
              {{ m.transcriptText }}
            </div>
          </NuxtLink>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
