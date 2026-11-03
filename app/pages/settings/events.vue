<template>
  <UDashboardPanel id="events" class="min-h-0" :ui="{ body: 'p-0 sm:p-0' }">
    <template #header><AppNavbar /></template>
    <template #body>
      <div class="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        <header class="mb-6 sm:mb-8">
          <div class="mb-2 flex items-center gap-2 text-xs text-muted"><UIcon name="i-lucide-settings-2" class="size-3.5" /> Settings <UIcon name="i-lucide-chevron-right" class="size-3" /> Events</div>
          <h1 class="text-xl font-semibold tracking-tight text-highlighted sm:text-2xl">Events & triggers</h1>
          <p class="mt-1 max-w-xl text-sm leading-6 text-muted">Connect an app, choose the events Thinky should listen for, and configure how they arrive.</p>
        </header>
        <SettingsNav class="mb-7 sm:mb-9" />
        <EventsPanel />
      </div>
    </template>
  </UDashboardPanel>
</template>
