<template>
  <UDashboardPanel id="events" class="min-h-0 overflow-x-hidden" :ui="{ body: 'p-0 sm:p-0' }">
    <template #header><AppNavbar /></template>
    <template #body>
      <div class="mx-auto w-full max-w-6xl px-3 pb-8 pt-[calc(var(--ui-header-height,3.5rem)+1.5rem)] sm:px-6 sm:pb-12 sm:pt-[calc(var(--ui-header-height,3.5rem)+2rem)]">
        <header class="mb-6 sm:mb-8">
          <h1 class="text-lg font-semibold tracking-tight text-highlighted sm:text-xl">Events & triggers</h1>
        </header>
        <SettingsNav class="mb-7 sm:mb-9" />
        <SettingsEventsPanel />
      </div>
    </template>
  </UDashboardPanel>
</template>
