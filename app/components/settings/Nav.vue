<script setup lang="ts">
const route = useRoute();

const items = [
  { label: "Profile", to: "/settings/profile", icon: "i-lucide-user-round" },
  { label: "Integrations", to: "/settings/integrations", icon: "i-lucide-plug" },
  { label: "Apps", to: "/settings/apps", icon: "i-lucide-layout-grid" },
  { label: "Events", to: "/settings/events", icon: "i-lucide-zap" },
];

function isActive(path: string) {
  return route.path === path;
}
</script>

<template>
  <nav class="grid w-full grid-cols-4 gap-0 overflow-hidden rounded-xl border border-default bg-elevated/20 p-1 sm:flex sm:gap-1 sm:overflow-visible sm:rounded-none sm:border-0 sm:border-b sm:bg-transparent sm:p-0">
    <NuxtLink
      v-for="item in items"
      :key="item.to"
      :to="item.to"
      class="relative inline-flex min-w-0 items-center justify-center gap-1 border-b-2 px-1.5 py-2.5 text-[11px] transition-colors sm:-mb-px sm:gap-2 sm:px-3 sm:text-sm"
      :class="isActive(item.to)
        ? 'border-highlighted font-medium text-highlighted'
        : 'border-transparent text-muted hover:text-toned'"
    >
      <UIcon
        :name="item.icon"
        class="size-4 shrink-0"
      />
      {{ item.label }}
    </NuxtLink>
  </nav>
</template>
