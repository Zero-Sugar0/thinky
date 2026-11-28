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
const specialistProfiles: Record<string, { name: string; team: string }> = {
  communicator: { name: "Alice Morgan", team: "Writing" },
  growth: { name: "Marcus Lee", team: "Growth" },
  meetings: { name: "Priya Shah", team: "Meetings" },
  planner: { name: "Jordan Ellis", team: "Planning" },
  researcher: { name: "Maya Chen", team: "Research" },
  seo: { name: "Oliver Reed", team: "SEO" },
  operations: { name: "Elena Ruiz", team: "Operations" },
  finance: { name: "Daniel Brooks", team: "Finance" },
};

function getTerminalToolName(toolName: string) {
  return toolName.split(/__|:/).filter(Boolean).at(-1) ?? toolName;
}

function humanizeToolName(value: string) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim()
    .replace(/\b\w/g, letter => letter.toUpperCase());
}

function getVisibleToolName(part: Parameters<typeof getToolName>[0]) {
  const toolName = getToolName(part);
  const baseName = getTerminalToolName(toolName);
  const specialist = specialistProfiles[baseName];
  if (specialist) return `${specialist.name} · ${specialist.team}`;

  if (isDynamicToolUIPart(part)) {
    const dynamicPart = part as EveDynamicToolPart;
    const namespace = getToolNamespace(dynamicPart);
    const isComposioTool = namespace === "composio" || /(?:^|[:_])composio(?:[:_]|$)/i.test(toolName);
    const composioAction = toolName
      .replace(/^.*?composio(?:__|:|_)/i, "")
      .replace(/^.*?(?:__|:)/, "");

    if (isComposioTool && /^(search|find)$/i.test(composioAction)) return "Find an app action";
    if (isComposioTool && /^(status|list_apps)$/i.test(composioAction)) return "Connected apps";
    if (isComposioTool) return humanizeToolName(composioAction || "App action");
    if (baseName === "load_skill") return "Thinky skill";

    return getToolDisplayName(dynamicPart);
  }
  return humanizeToolName(baseName);
}

function getVisibleToolTeam(part: Parameters<typeof getToolName>[0]) {
  const toolName = getToolName(part);
  const baseName = getTerminalToolName(toolName);
  if (specialistProfiles[baseName]) return specialistProfiles[baseName].team;
  if (!isDynamicToolUIPart(part)) return undefined;

  const dynamicPart = part as EveDynamicToolPart;
  const namespace = getToolNamespace(dynamicPart);
  return namespace === "composio" || /(?:^|[:_])composio(?:[:_]|$)/i.test(toolName)
    ? "Apps"
    : undefined;
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
  <div
    class="chat-message-content flex min-w-0 flex-col gap-1"
    :class="message.role === 'user' ? 'w-full items-end' : 'w-full items-start'"
  >
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
        :text="getVisibleToolName(part)"
        :suffix="getVisibleToolTeam(part)"
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
        class="chat-prose chat-assistant-copy relative min-w-0 max-w-full text-[13px] leading-[1.4] text-default [overflow-wrap:anywhere] [&_a]:font-medium [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_a]:decoration-primary/40 [&_a:hover]:decoration-primary [&_code]:text-[0.85em]"
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
          class="chat-prose chat-user-bubble ml-auto w-fit max-w-[min(100%,32rem)] rounded-xl border border-default bg-elevated px-3 py-2 text-[13px] leading-[1.4] text-highlighted [overflow-wrap:anywhere] [&_a]:font-medium [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_pre]:my-1 [&_pre]:max-w-full [&_table]:text-[12px]"
        >
          <ChatComark
            :value="part.text"
            :streaming="isPartStreaming(part)"
          />
        </div>
    </template>
  </template>
  </div>
</template>
