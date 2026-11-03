<script setup lang="ts">
const props = defineProps<{
  class?: string | Record<string, boolean> | (string | undefined)[];
}>();
</script>

<template>
  <th
    class="whitespace-nowrap px-3 py-2 text-left font-semibold text-highlighted border-b border-default text-[11px]"
    :class="props.class"
  >
    <slot />
  </th>
</template>
