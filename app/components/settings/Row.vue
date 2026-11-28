<script setup lang="ts">
defineProps<{
  label: string;
  description?: string;
  hint?: string;
  inline?: boolean;
}>();
</script>

<template>
  <div
    class="px-4 py-4 sm:px-5"
    :class="inline ? 'grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(14rem,0.9fr)] sm:items-center sm:gap-6' : undefined"
  >
    <div
      class="min-w-0"
      :class="inline ? undefined : 'mb-3'"
    >
      <p class="text-sm text-highlighted">
        {{ label }}
      </p>
      <p
        v-if="description"
        class="mt-0.5 text-xs text-muted"
      >
        {{ description }}
      </p>
    </div>

    <div
      v-if="$slots.default"
      class="min-w-0 w-full sm:w-auto"
      :class="inline ? 'sm:flex sm:justify-end' : undefined"
    >
      <slot />
      <p
        v-if="hint"
        class="mt-1.5 text-xs text-dimmed"
      >
        {{ hint }}
      </p>
    </div>

    <slot
      v-else
      name="control"
    />
  </div>
</template>
