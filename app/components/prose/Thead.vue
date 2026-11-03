<script setup lang="ts">
const props = defineProps<{
  class?: string | Record<string, boolean> | (string | undefined)[];
}>();
</script>

<template>
  <thead
    class="border-b border-default bg-elevated/50 text-[11px] font-semibold uppercase tracking-wider text-muted select-none"
    :class="props.class"
  >
    <slot />
  </thead>
</template>
