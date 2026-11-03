<script setup lang="ts">
const props = defineProps<{
  class?: string | Record<string, boolean> | (string | undefined)[];
}>();
</script>

<template>
  <tbody
    class="divide-y divide-default/40"
    :class="props.class"
  >
    <slot />
  </tbody>
</template>
