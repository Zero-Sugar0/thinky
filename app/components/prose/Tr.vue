<script setup lang="ts">
const props = defineProps<{
  class?: string | Record<string, boolean> | (string | undefined)[];
}>();
</script>

<template>
  <tr
    class="border-b border-default/50 transition-colors hover:bg-muted/10 last:border-0"
    :class="props.class"
  >
    <slot />
  </tr>
</template>
