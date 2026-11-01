<script setup lang="ts">
import type { FileUIPart } from "ai";

const props = defineProps<{ part: FileUIPart }>();
const isImage = computed(() => props.part.mediaType.startsWith("image/"));
const label = computed(() => props.part.filename || "Attached file");
</script>

<template>
  <a
    :href="part.url"
    :download="part.filename"
    target="_blank"
    rel="noopener noreferrer"
    class="group inline-flex max-w-full items-center gap-2 rounded-xl border border-default bg-elevated/70 p-1.5 text-left transition-colors hover:bg-accented"
  >
    <img
      v-if="isImage"
      :src="part.url"
      :alt="label"
      class="size-16 rounded-lg object-cover"
    >
    <span
      v-else
      class="flex size-16 shrink-0 items-center justify-center rounded-lg bg-muted text-dimmed"
      aria-hidden="true"
    >
      <UIcon name="i-lucide-file" class="size-6" />
    </span>
    <span class="min-w-0 pe-2">
      <span class="block max-w-48 truncate text-xs font-medium text-highlighted">{{ label }}</span>
      <span class="block text-[11px] text-dimmed">{{ part.mediaType }}</span>
    </span>
  </a>
</template>
