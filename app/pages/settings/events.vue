<template>
  <UDashboardPanel id="events" class="min-h-0 overflow-x-hidden" :ui="{ body: 'p-0 sm:p-0' }">
    <template #header><AppNavbar /></template>
    <template #body>
      <div class="mx-auto w-full max-w-6xl px-3 pb-8 pt-[calc(var(--ui-header-height,3.5rem)+1.5rem)] sm:px-6 sm:pb-12 sm:pt-[calc(var(--ui-header-height,3.5rem)+2rem)]">
        <header class="mb-6 sm:mb-8">
          <div class="mb-2 flex items-center gap-2 text-xs text-muted"><UIcon name="i-lucide-settings-2" class="size-3.5" /> Settings <UIcon name="i-lucide-chevron-right" class="size-3" /> Events</div>
          <h1 class="text-base font-medium tracking-tight text-highlighted sm:text-lg">Events & triggers</h1>
          <p class="mt-1 max-w-xl text-xs leading-5 text-muted sm:text-sm">Connect an app, choose the events Thinky should listen for, and configure how they arrive.</p>
        </header>
        <SettingsNav class="mb-7 sm:mb-9" />
        <SettingsEventsPanel />
      </div>
    </template>
  </UDashboardPanel>
</template>
