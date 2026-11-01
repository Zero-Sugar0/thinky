<script setup lang="ts">
const props = defineProps<{
  threadId: string;
}>();

const emit = defineEmits<{
  (e: "select", suggestionText: string): void;
}>();

interface ProactiveItem {
  id: string;
  type: string;
  content: string;
  createdAt: string;
}

const dismissed = ref<Record<string, boolean>>({});

const { data } = await useFetch<{ suggestions: ProactiveItem[] }>(
  () => `/api/threads/${props.threadId}/proactive`,
  {
    key: `thread-proactive-${props.threadId}`,
    default: () => ({ suggestions: [] }),
  },
);

const activeSuggestions = computed(() => {
  return (data.value?.suggestions || []).filter(s => !dismissed.value[s.id]);
});

function dismiss(id: string) {
  dismissed.value[id] = true;
}

function reply(suggestion: ProactiveItem) {
  emit("select", `Regarding your suggestion: "${suggestion.content}"`);
  dismiss(suggestion.id);
}
</script>

<template>
  <div
    v-if="activeSuggestions.length > 0"
    class="space-y-2 py-2"
  >
    <div
      v-for="s in activeSuggestions"
      :key="s.id"
      class="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm text-toned shadow-xs transition-colors hover:border-primary/40"
    >
      <div class="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <UIcon
          :name="s.type === 'deadline' ? 'i-lucide-alarm-clock' : s.type === 'client_followup' ? 'i-lucide-briefcase' : s.type === 'todo' ? 'i-lucide-check-circle-2' : 'i-lucide-sparkles'"
          class="size-4"
        />
      </div>

      <div class="min-w-0 flex-1">
        <p class="font-medium text-highlighted">
          {{ s.type === 'deadline' ? 'Upcoming Deadline' : s.type === 'client_followup' ? 'Client Follow-up' : s.type === 'todo' ? 'Pending Todo' : 'Proactive Check-in' }}
        </p>
        <p class="mt-0.5 text-xs text-muted sm:text-sm">
          {{ s.content }}
        </p>
        <div class="mt-2 flex gap-2">
          <UButton
            size="xs"
            color="primary"
            variant="soft"
            label="Answer Thinky"
            @click="reply(s)"
          />
          <UButton
            size="xs"
            color="neutral"
            variant="ghost"
            label="Dismiss"
            @click="dismiss(s.id)"
          />
        </div>
      </div>
    </div>
  </div>
</template>
