<script setup lang="ts">
import type { ThreadRecord } from "#shared/types/thread";
import { useChatNavigation, refreshThreadList } from "~/composables/chat/navigation";
import { useAuthorizationChallenges } from "~/composables/chat/useAuthorizationChallenges";
import { useStreamLog } from "~/composables/chat/stream-log";
import { useChatSession } from "~/composables/chat/useChatSession";

const route = useRoute();
const chatId = computed(() => route.params.id as string);

// Fetched during the server render too, so the thread's durable session id is
// known before the chat session binds to it.
const requestFetch = useRequestFetch();

const { data, error, pending: resumePending } = await useAsyncData(
  () => `thread-${chatId.value}`,
  () => requestFetch<{ thread: ThreadRecord }>(`/api/threads/${chatId.value}`),
  { watch: [chatId] },
);

if (error.value || !data.value?.thread) {
  await navigateTo("/");
}

const thread = computed(() => data.value!.thread);

const {
  messages,
  status,
  error: chatError,
  isBusy,
  send,
  respond,
  cancel,
  retry,
} = useChatSession(thread.value);

const { consumePendingOnMount } = useChatNavigation(chatId);
const { resetTurnEventCounts } = useStreamLog();
const { pendingChallenges, failedChallenges, tryResumeConnectedChallenges } = useAuthorizationChallenges();

const input = ref("");
const attachmentInput = ref<HTMLInputElement>();
const attachmentName = ref("");
const attachment = ref<{ data: string; mediaType: string; filename: string }>();

function openAttachmentPicker() {
  attachmentInput.value?.click();
}

function handleAttachmentChange(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) {
    attachment.value = undefined;
    attachmentName.value = "";
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    if (typeof reader.result !== "string") return;
    attachment.value = { data: reader.result, mediaType: file.type || "application/octet-stream", filename: file.name };
    attachmentName.value = file.name;
  };
  reader.readAsDataURL(file);
}

watch(status, (value) => {
  if (value === "submitted") {
    resetTurnEventCounts();
  }
});

onMounted(() => {
  void refreshThreadList();
  void tryResumeConnectedChallenges({ skipIfBusy: isBusy.value });

  if (import.meta.client) {
    const onFocus = () => {
      void tryResumeConnectedChallenges({ skipIfBusy: isBusy.value });
    };
    window.addEventListener("focus", onFocus);
    onUnmounted(() => window.removeEventListener("focus", onFocus));
  }

  consumePendingOnMount(send);
});

function handleSubmit(e: Event) {
  e.preventDefault();
  const text = input.value.trim();
  if ((!text && !attachment.value) || isBusy.value) return;
  const selectedAttachment = attachment.value;
  input.value = "";
  attachment.value = undefined;
  attachmentName.value = "";
  if (attachmentInput.value) attachmentInput.value.value = "";
  void send(text, selectedAttachment);
}

function handleInputResponses(responses: Parameters<typeof respond>[0]) {
  void respond(responses);
}
</script>

<template>
  <UDashboardPanel
    id="chat"
    class="relative min-h-0"
    :ui="{ body: 'p-0 sm:p-0 overscroll-none' }"
  >
    <template #header>
      <AppNavbar>
        <template #title>
          <p class="truncate text-sm font-medium text-highlighted">
            {{ thread.title }}
          </p>
        </template>
      </AppNavbar>
    </template>

    <template #body>
      <div
        v-if="resumePending"
        class="flex flex-1 items-center justify-center text-sm text-dimmed"
      >
        Loading chat…
      </div>

      <div
        v-else
        class="flex flex-1"
      >
        <UContainer class="flex flex-1 flex-col gap-4 sm:gap-6">
          <UChatMessages
            should-auto-scroll
            :messages="messages"
            :status="status"
            :spacing-offset="160"
            :assistant="{ side: 'left', variant: 'naked', ui: { container: 'relative flex w-full min-w-0 items-start' } }"
            class="pt-(--ui-header-height) pb-4 sm:pb-6"
          >
            <template #indicator>
              <ChatActivityIndicator />
            </template>

            <template #content="{ message }">
              <ChatMessageContentEve
                :message="message"
                :status="status"
                :is-last="message.id === messages.at(-1)?.id"
                :can-respond="!isBusy"
                @input-responses="handleInputResponses"
              />
            </template>
          </UChatMessages>

          <div
            v-if="pendingChallenges.length || failedChallenges.length"
            class="space-y-2"
          >
            <AgentAuthorizationRequest
              v-for="challenge in pendingChallenges"
              :key="`pending-${challenge.name}`"
              :challenge="challenge"
            />
            <AgentAuthorizationRequest
              v-for="challenge in failedChallenges"
              :key="`failed-${challenge.name}`"
              :challenge="challenge"
            />
          </div>

          <UChatPrompt
            v-model="input"
            :error="chatError"
            variant="subtle"
            class="sticky bottom-0 z-10 [view-transition-name:chat-prompt] rounded-b-none"
            :ui="{ base: 'px-1.5' }"
            @submit="handleSubmit"
          >
            <template #footer>
              <input
                ref="attachmentInput"
                type="file"
                accept="image/*,.pdf,.txt,.csv,.md,.json,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                class="sr-only"
                @change="handleAttachmentChange"
              >
              <UButton
                icon="i-lucide-plus"
                color="neutral"
                variant="ghost"
                size="sm"
                aria-label="Attach an image or file"
                title="Attach an image or file"
                @click="openAttachmentPicker"
              />
              <span
                v-if="attachment"
                class="inline-flex max-w-56 items-center gap-2 rounded-lg border border-default bg-elevated px-1.5 py-1"
              >
                <img
                  v-if="attachment.mediaType.startsWith('image/')"
                  :src="attachment.data"
                  :alt="attachment.filename"
                  class="size-7 rounded object-cover"
                >
                <UIcon
                  v-else
                  name="i-lucide-file"
                  class="ms-1 size-4 text-dimmed"
                  aria-hidden="true"
                />
                <span
                  class="min-w-0 truncate text-xs text-dimmed"
                  :title="attachmentName"
                >
                  {{ attachmentName }}
                </span>
                <UButton
                  icon="i-lucide-x"
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  aria-label="Remove attachment"
                  @click="attachment = undefined; attachmentName = ''; if (attachmentInput) attachmentInput.value = ''"
                />
              </span>
              <ChatStreamInspector :status="status" />

              <UChatPromptSubmit
                class="ms-auto shrink-0"
                :status="status"
                color="neutral"
                size="sm"
                @stop="cancel()"
                @reload="retry()"
              />
            </template>
          </UChatPrompt>
        </UContainer>
      </div>
    </template>
  </UDashboardPanel>
</template>
