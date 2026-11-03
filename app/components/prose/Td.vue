<script setup lang="ts">
const props = defineProps<{
  class?: string | Record<string, boolean> | (string | undefined)[];
}>();
</script>

<template>
  <td
    class="px-3 py-2 text-xs leading-5 text-toned border-b border-default/50 align-top [overflow-wrap:normal]"
    :class="props.class"
  >
    <slot />
  </td>
</template>
