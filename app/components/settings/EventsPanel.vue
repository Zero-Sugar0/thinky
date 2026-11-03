<script setup lang="ts">
import type { ComposioAppSummary } from "~~/server/utils/composio";

interface TriggerRecord {
  id?: string;
  triggerId?: string;
  triggerName?: string;
  triggerSlug?: string;
  disabledAt?: string | null;
}

interface TriggerType {
  slug?: string;
  name?: string;
  description?: string;
}

interface AppsResponse {
  apps: ComposioAppSummary[];
  configured: boolean;
}

const toast = useToast();
const { data, pending, error, refresh } = useFetch<AppsResponse>("/api/composio/apps", { server: false });
const selectedApp = ref<ComposioAppSummary>();
const selectedType = ref("");
const triggerConfig = ref("{}");
const triggerTypes = ref<TriggerType[]>([]);
const triggers = ref<TriggerRecord[]>([]);
const loading = ref(false);
const saving = ref(false);
const appSearchQuery = ref("");
const failedLogos = ref<Record<string, boolean>>({});

const isConfigured = computed(() => data.value?.configured ?? true);
const allApps = computed(() => data.value?.apps ?? []);

const filteredApps = computed(() => {
  const query = appSearchQuery.value.trim().toLowerCase();
  if (!query) return allApps.value;
  return allApps.value.filter(
    app =>
      app.name.toLowerCase().includes(query)
      || app.slug.toLowerCase().includes(query)
      || app.description?.toLowerCase().includes(query),
  );
});

const connectedApps = computed(() => allApps.value.filter(app => app.isConnected));
const unconnectedApps = computed(() => allApps.value.filter(app => !app.isConnected));

async function loadApp(app?: ComposioAppSummary) {
  selectedApp.value = app;
  selectedType.value = "";
  triggerTypes.value = [];
  triggers.value = [];
  if (!app) return;
  loading.value = true;
  try {
    const result = await $fetch<{ types: TriggerType[]; triggers: TriggerRecord[] }>("/api/composio/triggers", {
      query: { toolkit: app.slug },
    });
    triggerTypes.value = result.types ?? [];
    triggers.value = result.triggers ?? [];
  } catch (err) {
    toast.add({
      title: "Could not load events",
      description: err instanceof Error ? err.message : "Try again later",
      color: "error",
    });
  } finally {
    loading.value = false;
  }
}

async function enableTrigger() {
  if (!selectedApp.value || !selectedType.value) return;
  let config: Record<string, unknown>;
  try {
    config = JSON.parse(triggerConfig.value || "{}");
  } catch {
    toast.add({
      title: "Invalid configuration",
      description: "Use a valid JSON object.",
      color: "error",
    });
    return;
  }
  saving.value = true;
  try {
    await $fetch("/api/composio/triggers", {
      method: "POST",
      body: {
        slug: selectedType.value,
        triggerConfig: config,
        connectedAccountId: selectedApp.value.connectedAccountId,
      },
    });
    toast.add({
      title: "Event enabled",
      description: `${selectedType.value} is now live for Thinky.`,
      color: "success",
    });
    await loadApp(selectedApp.value);
  } catch (err) {
    toast.add({
      title: "Could not enable event",
      description: err instanceof Error ? err.message : "Try again later",
      color: "error",
    });
  } finally {
    saving.value = false;
  }
}

async function toggleTrigger(trigger: TriggerRecord) {
  const id = trigger.id ?? trigger.triggerId;
  if (!id) return;
  try {
    await $fetch(`/api/composio/triggers/${id}`, {
      method: "PATCH",
      body: { enabled: Boolean(trigger.disabledAt) },
    });
    await loadApp(selectedApp.value);
  } catch (err) {
    toast.add({
      title: "Action failed",
      description: err instanceof Error ? err.message : "Try again later",
      color: "error",
    });
  }
}

async function deleteTrigger(trigger: TriggerRecord) {
  const id = trigger.id ?? trigger.triggerId;
  if (!id) return;
  try {
    await $fetch(`/api/composio/triggers/${id}`, { method: "DELETE" });
    toast.add({
      title: "Event removed",
      description: "Trigger has been disabled and removed.",
      color: "success",
    });
    await loadApp(selectedApp.value);
  } catch (err) {
    toast.add({
      title: "Delete failed",
      description: err instanceof Error ? err.message : "Try again later",
      color: "error",
    });
  }
}
</script>

<template>
  <div class="space-y-4">
    <UAlert
      v-if="!isConfigured"
      color="warning"
      variant="subtle"
      title="Composio API Key Required"
      description="To enable 1700+ app event triggers with Composio, set COMPOSIO_API_KEY in your environment variables."
      class="mb-4"
    />

    <div class="grid gap-6 lg:grid-cols-[minmax(14rem,0.78fr)_minmax(0,1.45fr)]">
      <aside class="space-y-2.5">
        <div class="flex items-center justify-between px-1">
          <div>
            <p class="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
              Apps Catalog
            </p>
            <p class="text-[11px] text-dimmed">
              {{ connectedApps.length }} connected · {{ allApps.length }} total
            </p>
          </div>
          <UButton
            size="xs"
            color="neutral"
            variant="ghost"
            icon="i-lucide-refresh-cw"
            :loading="pending"
            aria-label="Refresh apps"
            @click="() => refresh()"
          />
        </div>

        <UInput
          v-model="appSearchQuery"
          icon="i-lucide-search"
          size="xs"
          placeholder="Filter apps..."
          class="w-full text-xs"
        />

        <div class="max-h-[30rem] space-y-1 overflow-y-auto rounded-xl border border-default bg-elevated/20 p-1.5">
          <div
            v-if="pending && !allApps.length"
            class="space-y-1.5 p-1"
          >
            <USkeleton
              v-for="i in 5"
              :key="i"
              class="h-9 w-full rounded-lg"
            />
          </div>

          <p
            v-else-if="error"
            class="px-2.5 py-5 text-center text-xs text-error"
          >
            Unable to load the app catalog: {{ error.message }}
          </p>

          <p
            v-else-if="!filteredApps.length"
            class="px-2.5 py-5 text-center text-xs text-muted"
          >
            No apps match your search.
          </p>

          <template v-else>
            <button
              v-for="app in filteredApps"
              :key="app.slug"
              type="button"
              class="group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs transition-colors"
              :class="[
                selectedApp?.slug === app.slug
                  ? 'bg-primary/10 text-highlighted ring-1 ring-primary/30'
                  : 'text-toned hover:bg-muted/15',
                !app.isConnected ? 'opacity-70 hover:opacity-100' : ''
              ]"
              @click="loadApp(app)"
            >
              <span class="flex size-7 shrink-0 items-center justify-center rounded-md border border-default bg-default">
                <img
                  v-if="app.logo && !failedLogos[app.slug]"
                  :src="app.logo"
                  :alt="app.name"
                  class="size-5 object-contain"
                  @error="failedLogos[app.slug] = true"
                >
                <UIcon
                  v-else
                  :name="app.icon || 'i-lucide-box'"
                  class="size-4 text-toned"
                />
              </span>
              <span class="min-w-0 flex-1 truncate font-medium">{{ app.name }}</span>
              <UBadge
                v-if="app.isConnected"
                color="success"
                variant="subtle"
                size="xs"
              >
                Connected
              </UBadge>
              <NuxtLink
                v-else
                to="/settings/apps"
                class="text-[10px] text-muted underline decoration-dotted hover:text-highlighted"
                @click.stop
              >
                Connect
              </NuxtLink>
            </button>
          </template>
        </div>

        <p
          v-if="unconnectedApps.length"
          class="px-1 text-[11px] leading-5 text-muted"
        >
          Unconnected apps must first be linked under
          <NuxtLink
            to="/settings/apps"
            class="font-medium text-highlighted underline underline-offset-2"
          >
            Settings → Apps
          </NuxtLink>
          before receiving real-time trigger webhooks.
        </p>
      </aside>

      <section class="min-w-0">
        <div
          v-if="!selectedApp"
          class="flex min-h-72 flex-col items-center justify-center rounded-xl border border-dashed border-default bg-elevated/15 px-6 text-center"
        >
          <div class="mb-3 flex size-12 items-center justify-center rounded-full bg-elevated border border-default">
            <UIcon
              name="i-lucide-zap"
              class="size-6 text-muted"
            />
          </div>
          <h2 class="text-sm font-medium text-highlighted">
            Choose an app to configure triggers
          </h2>
          <p class="mt-1 max-w-sm text-xs leading-5 text-muted">
            Select any app from the list to view incoming event types, active triggers, and webhook listeners for Thinky.
          </p>
        </div>

        <template v-else>
          <div class="mb-4 flex items-start justify-between gap-3 border-b border-default pb-3">
            <div class="flex items-center gap-2.5">
              <span class="flex size-9 shrink-0 items-center justify-center rounded-lg border border-default bg-elevated">
                <img
                  v-if="selectedApp.logo && !failedLogos[selectedApp.slug]"
                  :src="selectedApp.logo"
                  :alt="selectedApp.name"
                  class="size-6 object-contain"
                >
                <UIcon
                  v-else
                  :name="selectedApp.icon || 'i-lucide-box'"
                  class="size-5 text-toned"
                />
              </span>
              <div>
                <p class="text-sm font-semibold text-highlighted sm:text-base">
                  {{ selectedApp.name }} triggers
                </p>
                <p class="text-xs text-muted">
                  {{ triggerTypes.length }} available event types · {{ triggers.length }} active
                </p>
              </div>
            </div>

            <div class="flex items-center gap-2">
              <UBadge
                v-if="selectedApp.isConnected"
                color="success"
                variant="subtle"
                size="sm"
              >
                <span class="mr-1.5 size-1.5 rounded-full bg-emerald-500" /> Connected
              </UBadge>
              <UButton
                v-else
                to="/settings/apps"
                color="neutral"
                variant="outline"
                size="xs"
                trailing-icon="i-lucide-arrow-up-right"
              >
                Connect in Apps
              </UButton>
            </div>
          </div>

          <div
            v-if="!selectedApp.isConnected"
            class="mb-4 rounded-xl border border-default bg-elevated/20 p-4 text-xs text-muted"
          >
            <p class="font-medium text-highlighted">
              This app is not connected yet.
            </p>
            <p class="mt-1">
              Connect {{ selectedApp.name }} in the Apps tab to authorize Thinky to receive event triggers.
            </p>
            <UButton
              to="/settings/apps"
              class="mt-3"
              color="primary"
              size="xs"
              trailing-icon="i-lucide-arrow-up-right"
            >
              Go to Apps
            </UButton>
          </div>

          <div
            v-else
            class="mb-4 rounded-xl border border-default bg-elevated/20 p-3 sm:p-4"
          >
            <div class="mb-3 flex items-center gap-2">
              <UIcon
                name="i-lucide-plus-circle"
                class="size-4 text-primary"
              />
              <p class="text-xs font-semibold text-highlighted">
                Enable an event trigger
              </p>
            </div>
            <USelectMenu
              v-model="selectedType"
              :items="triggerTypes.map(type => ({ label: type.name || type.slug || '', value: type.slug || '' }))"
              value-key="value"
              searchable
              placeholder="Search all available event types..."
              size="sm"
            />
            <UTextarea
              v-model="triggerConfig"
              :rows="2"
              class="mt-2 font-mono text-xs"
              placeholder='Optional JSON configuration, e.g. {"calendar_id":"primary"}'
            />
            <UButton
              class="mt-2.5"
              color="primary"
              size="xs"
              :loading="saving"
              :disabled="!selectedType"
              @click="enableTrigger"
            >
              Enable event trigger
            </UButton>
          </div>

          <div
            v-if="loading"
            class="space-y-2"
          >
            <USkeleton
              v-for="i in 3"
              :key="i"
              class="h-12 rounded-lg"
            />
          </div>

          <div
            v-else-if="triggers.length"
            class="overflow-hidden rounded-xl border border-default"
          >
            <div
              v-for="trigger in triggers"
              :key="trigger.id || trigger.triggerId"
              class="flex items-center gap-3 border-b border-default px-3 py-3 last:border-0 hover:bg-muted/5 transition-colors"
            >
              <div class="min-w-0 flex-1">
                <p class="truncate text-xs font-medium text-highlighted">
                  {{ trigger.triggerName || trigger.triggerSlug || 'Event trigger' }}
                </p>
                <p class="mt-0.5 truncate text-[11px] text-muted font-mono">
                  {{ trigger.id || trigger.triggerId }}
                </p>
              </div>
              <UBadge
                :color="trigger.disabledAt ? 'neutral' : 'success'"
                variant="subtle"
                size="xs"
              >
                {{ trigger.disabledAt ? 'Paused' : 'Active' }}
              </UBadge>
              <UButton
                color="neutral"
                variant="ghost"
                size="xs"
                :icon="trigger.disabledAt ? 'i-lucide-play' : 'i-lucide-pause'"
                :aria-label="trigger.disabledAt ? 'Enable event' : 'Pause event'"
                @click="toggleTrigger(trigger)"
              />
              <UButton
                color="error"
                variant="ghost"
                size="xs"
                icon="i-lucide-trash-2"
                aria-label="Delete event"
                @click="deleteTrigger(trigger)"
              />
            </div>
          </div>

          <div
            v-else
            class="rounded-xl border border-dashed border-default px-4 py-8 text-center text-xs text-muted"
          >
            No active triggers enabled for {{ selectedApp.name }} yet.
          </div>
        </template>
      </section>
    </div>
  </div>
</template>
