<script setup lang="ts">
import {
  getToolName,
  isDynamicToolUIPart,
  isReasoningUIPart,
  isTextUIPart,
  isToolUIPart,
} from "ai";
import type { FileUIPart, UIMessage } from "ai";
import type { EveDynamicToolPart } from "eve/vue";
import { isPartStreaming, isToolStreaming } from "@nuxt/ui/utils/ai";
import type { AgentInputResponse } from "~/components/AgentInputRequest.vue";
import type { ChatStatus } from "~/composables/chat/useChatSession";
import { getMergedParts } from "~/utils/chat/ai";
import { hasVisibleParts, getToolDisplayName, getToolNamespace, normalizeEveParts, shouldShowToolInput } from "~/utils/chat/eve";
import type { WeatherUIToolInvocation } from "~~/shared/utils/tools/weather";
import type {
  CamofoxOpenUIToolInvocation,
  CamofoxScreenshotUIToolInvocation,
} from "~~/shared/utils/tools/camofox";

const props = defineProps<{
  message: UIMessage;
  status: ChatStatus;
  isLast?: boolean;
  canRespond?: boolean;
}>();

const emit = defineEmits<{
  inputResponses: [responses: AgentInputResponse[]];
}>();

const rawParts = computed(() => props.message.parts);
const displayParts = computed(() => getMergedParts(normalizeEveParts(rawParts.value)));

const isBusy = computed(
  () => props.status === "submitted" || props.status === "streaming",
);

const showThinking = computed(
  () =>
    props.message.role === "assistant"
    && props.isLast
    && isBusy.value
    && !hasVisibleParts(rawParts.value),
);

const reaction = ref<"like" | "dislike" | null>(null);
const copied = ref(false);

async function copyMessage() {
  const text = props.message.parts
    .filter(part => part.type === "text")
    .map(part => part.text)
    .join("\n\n");
  if (!text || !import.meta.client) return;
  await navigator.clipboard.writeText(text);
  copied.value = true;
  window.setTimeout(() => { copied.value = false; }, 1600);
}
</script>

<template>
  <div class="chat-message-content space-y-1">
    <ChatActivityIndicator v-if="showThinking" />

  <template
    v-for="(part, index) in displayParts"
    :key="`${message.id}-part-${index}`"
  >
    <UChatReasoning
      v-if="isReasoningUIPart(part)"
      :text="part.text"
      :streaming="isPartStreaming(part)"
      chevron="leading"
      class="chat-tool-step"
    >
      <ChatComark
        :value="part.text"
        :streaming="isPartStreaming(part)"
      />
    </UChatReasoning>

    <template v-else-if="isToolUIPart(part) || isDynamicToolUIPart(part)">
      <ChatToolCamofoxLiveView
        v-if="getToolName(part) === 'camofox_open'"
        :invocation="part as CamofoxOpenUIToolInvocation"
        :active="Boolean(isLast && isBusy)"
      />
      <ChatToolCamofoxScreenshot
        v-if="getToolName(part) === 'camofox_screenshot'"
        :invocation="part as CamofoxScreenshotUIToolInvocation"
      />
      <ChatToolWeather
        v-else-if="getToolName(part) === 'weather'"
        :invocation="{ ...(part as WeatherUIToolInvocation) }"
        :streaming="isToolStreaming(part)"
      />
      <UChatTool
        v-else-if="getToolName(part) === 'web_search' || getToolName(part) === 'google_search'"
        :text="isToolStreaming(part) ? 'Searching the web...' : 'Searched the web'"
        :suffix="getSearchQuery(part)"
        :streaming="isToolStreaming(part)"
        chevron="leading"
        class="chat-tool-step"
      >
        <ChatToolSources :sources="getSources(part)" />
      </UChatTool>
      <UChatTool
        v-else-if="getToolName(part) !== 'ask_question'"
        :text="isDynamicToolUIPart(part) ? getToolDisplayName(part as EveDynamicToolPart) : getToolName(part)"
        :suffix="isDynamicToolUIPart(part) ? getToolNamespace(part as EveDynamicToolPart) : undefined"
        :streaming="isToolStreaming(part)"
        chevron="leading"
        :default-open="part.state === 'approval-requested' || part.state === 'approval-responded'"
        class="chat-tool-step"
      >
        <AgentInputRequest
          v-if="isDynamicToolUIPart(part)"
          :can-respond="canRespond ?? true"
          :part="part as EveDynamicToolPart"
          @input-responses="emit('inputResponses', $event)"
        />

        <pre
          v-if="part.input && (!isDynamicToolUIPart(part) || shouldShowToolInput(part as EveDynamicToolPart))"
          class="overflow-x-auto rounded-md bg-muted p-2 text-xs"
        >{{ JSON.stringify(part.input, null, 2) }}</pre>

        <pre
          v-if="part.output || part.errorText"
          class="overflow-x-auto rounded-md bg-muted p-2 text-xs"
          :class="part.errorText ? 'text-error' : ''"
        >{{ part.errorText ?? JSON.stringify(part.output, null, 2) }}</pre>
      </UChatTool>

      <AgentInputRequest
        v-else-if="isDynamicToolUIPart(part)"
        compact
        :can-respond="canRespond ?? true"
        :part="part as EveDynamicToolPart"
        @input-responses="emit('inputResponses', $event)"
      />
    </template>

    <ChatMessageMessageAttachment
      v-else-if="part.type === 'file'"
      :part="part as FileUIPart"
    />

    <template v-else-if="isTextUIPart(part)">
      <div
        v-if="message.role === 'assistant'"
        class="chat-prose relative min-w-0 text-xs sm:text-[13px] leading-5 sm:leading-[1.45rem] text-default [overflow-wrap:anywhere] [&_a]:font-medium [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_a]:decoration-primary/40 [&_a:hover]:decoration-primary [&_code]:text-[0.85em]"
      >
        <ChatComark
          :key="isPartStreaming(part) ? `${message.id}-text-${part.text.length}` : `${message.id}-text-${index}`"
          :value="part.text"
          :streaming="isPartStreaming(part)"
        />
        <span
          v-if="isPartStreaming(part) && isLast"
          class="ml-0.5 inline-block h-[1.1em] w-0.5 translate-y-px animate-pulse rounded-full bg-highlighted"
          aria-hidden="true"
        />
        <div v-if="!isPartStreaming(part)" class="mt-1.5 flex items-center gap-0.5 text-dimmed">
          <UButton icon="i-lucide-copy" :aria-label="copied ? 'Copied' : 'Copy response'" :title="copied ? 'Copied' : 'Copy response'" color="neutral" variant="ghost" size="xs" @click="copyMessage" />
          <UButton icon="i-lucide-volume-2" aria-label="Read response aloud" title="Read response aloud" color="neutral" variant="ghost" size="xs" />
          <UButton icon="i-lucide-thumbs-up" aria-label="Like response" title="Like response" color="neutral" variant="ghost" size="xs" :class="reaction === 'like' ? 'text-primary' : ''" @click="reaction = reaction === 'like' ? null : 'like'" />
          <UButton icon="i-lucide-thumbs-down" aria-label="Dislike response" title="Dislike response" color="neutral" variant="ghost" size="xs" :class="reaction === 'dislike' ? 'text-primary' : ''" @click="reaction = reaction === 'dislike' ? null : 'dislike'" />
          <span class="ml-1 text-[10px]">{{ copied ? 'Copied' : 'Just now' }}</span>
        </div>
      </div>
      <div
        v-else
        class="ml-auto flex w-full justify-end"
      >
        <div
          class="inline-block max-w-[85%] rounded-2xl rounded-tr-sm border border-default bg-elevated/70 px-3.5 py-2 text-xs sm:text-[13px] leading-5 text-highlighted shadow-xs [overflow-wrap:anywhere] [&_a]:font-medium [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2"
        >
          <p class="whitespace-pre-wrap">
            {{ part.text }}
          </p>
          <div class="mt-1 flex justify-end">
            <UButton icon="i-lucide-copy" aria-label="Copy sent message" title="Copy sent message" color="neutral" variant="ghost" size="xs" @click="copyMessage" />
          </div>
        </div>
      </div>
    </template>
  </template>
  </div>
</template>
