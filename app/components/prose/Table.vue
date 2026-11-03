<script setup lang="ts">
import TableRenderer from "../chat/TableRenderer.vue";

const props = defineProps<{
  class?: string | Record<string, boolean> | (string | undefined)[];
  ui?: {
    root?: string;
    base?: string;
  };
}>();
</script>

<template>
  <TableRenderer :class="props.class">
    <slot />
  </TableRenderer>
</template>
