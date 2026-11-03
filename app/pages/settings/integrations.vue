<script setup lang="ts">
const { connectors, error, refresh, isInitialLoad, pending } = useConnectors();

const connectedCount = computed(
  () => connectors.value?.filter(connector => connector.status.state === "connected").length ?? 0,
);

const totalCount = computed(() => connectors.value?.length ?? 0);

const servicesDescription = computed(() => {
  if (isInitialLoad.value || error.value) {
    return "OAuth tools available in chat, Slack, and iMessage once linked.";
  }
  return `${connectedCount.value} of ${totalCount.value} connected · OAuth tools available in chat, Slack, and iMessage once linked.`;
});
</script>

<template>
  <UDashboardPanel
    id="integrations"
    class="min-h-0"
    :ui="{ body: 'p-0 sm:p-0' }"
  >
    <template #header>
      <AppNavbar />
    </template>

    <template #body>
      <div class="mx-auto w-full max-w-2xl px-4 pb-8 pt-[calc(var(--ui-header-height,3.5rem)+1.5rem)] sm:px-6 sm:pb-12">
        <header class="mb-6 sm:mb-8">
          <h1 class="mb-1 text-base font-medium text-highlighted sm:text-lg">
            Settings
          </h1>
          <p class="max-w-lg text-xs text-muted sm:text-sm">
            Manage your identity, memory, and integrations.
          </p>
        </header>

        <SettingsNav class="mb-8" />

        <div class="space-y-8">
          <SettingsSection
            title="Channels"
            description="Link messaging platforms to your Thinky account."
          >
            <IntegrationsSlackLinkCard />
          </SettingsSection>

          <SettingsSection
            title="Services"
            :description="servicesDescription"
          >
            <template #default>
              <div
                v-if="isInitialLoad"
                class="px-4 py-3"
              >
                <USkeleton class="h-12 rounded-md" />
              </div>

              <div
                v-else-if="error"
                class="px-4 py-3"
              >
                <UAlert
                  color="error"
                  variant="subtle"
                  title="Failed to load services"
                  :description="error.message"
                />
              </div>

              <template v-else>
                <IntegrationsConnectorCard
                  v-for="connector in connectors"
                  :key="connector.id"
                  :connector="connector"
                  @refresh="refresh()"
                />
              </template>
            </template>

            <template #actions>
              <UButton
                color="neutral"
                variant="ghost"
                size="xs"
                icon="i-lucide-refresh-cw"
                :loading="pending"
                aria-label="Refresh services"
                @click="refresh()"
              />
            </template>
          </SettingsSection>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
