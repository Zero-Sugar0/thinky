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
const expandedMessageParts = ref(new Set<string>());

function isExpanded(key: string) {
  return expandedMessageParts.value.has(key);
}

function toggleExpanded(key: string) {
  const next = new Set(expandedMessageParts.value);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  expandedMessageParts.value = next;
}

const showThinking = computed(
  () =>
    props.message.role === "assistant"
    && props.isLast
    && isBusy.value
    && !hasVisibleParts(rawParts.value),
);

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
      </div>
        <div
          v-else
          class="inline-block max-w-[min(92%,42rem)] rounded-[1.25rem] rounded-tr-md bg-elevated/80 px-4 py-2.5 text-xs leading-5 text-highlighted shadow-sm ring-1 ring-inset ring-white/5 sm:text-[13px] [overflow-wrap:anywhere] [&_a]:font-medium [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2"
        >
          <p
            class="whitespace-pre-wrap"
            :class="!isExpanded(`${message.id}-${index}`) && part.text.split('\\n').length > 7 ? 'line-clamp-7' : ''"
          >
            {{ part.text }}
          </p>
          <button
            v-if="part.text.split('\\n').length > 7"
            type="button"
            class="mt-1 block w-full text-center text-xs font-medium text-muted transition-colors hover:text-highlighted"
            @click="toggleExpanded(`${message.id}-${index}`)"
          >
            {{ isExpanded(`${message.id}-${index}`) ? 'Show less' : 'Show full message' }}
          </button>
        </div>
    </template>
  </template>
  </div>
</template>
