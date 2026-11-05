<script setup lang="ts">
import type { ComposioAppSummary } from "~~/server/utils/composio";

interface TriggerRecord {
  id?: string;
  triggerId?: string;
  triggerName?: string;
  triggerSlug?: string;
  disabledAt?: string | null;
  createdAt?: string;
}

interface TriggerType {
  slug?: string;
  name?: string;
  description?: string;
  config?: Record<string, unknown>;
  payload?: Record<string, unknown>;
}

interface AppsResponse {
  apps: ComposioAppSummary[];
  configured: boolean;
}

const toast = useToast();
const { data, pending, refresh } = useFetch<AppsResponse>("/api/composio/apps", { server: false });

const selectedApp = ref<ComposioAppSummary>();
const selectedType = ref("");
const triggerConfig = ref("{}");
const triggerTypes = ref<TriggerType[]>([]);
const triggers = ref<TriggerRecord[]>([]);
const selectedTypeDetail = ref<TriggerType | null>(null);

const loading = ref(false);
const saving = ref(false);
const connectingSlug = ref<string | null>(null);
const appSearchQuery = ref("");

const allApps = computed(() => data.value?.apps ?? []);
const connectedApps = computed(() => allApps.value.filter(app => app.isConnected));

function formatTriggerName(trigger?: TriggerType | TriggerRecord) {
  const raw = trigger && "name" in trigger
    ? trigger.name
    : trigger && "triggerName" in trigger
      ? trigger.triggerName || trigger.triggerSlug
      : trigger && "slug" in trigger ? trigger.slug : undefined;
  return (raw || "Event trigger")
    .replace(/_TRIGGER$/i, "")
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter: string) => letter.toUpperCase());
}

const displayedApps = computed(() => {
  const base = allApps.value;
  if (!appSearchQuery.value.trim()) return base;
  const q = appSearchQuery.value.trim().toLowerCase();
  return base.filter(app =>
    app.name.toLowerCase().includes(q)
    || app.slug.toLowerCase().includes(q)
    || (app.description && app.description.toLowerCase().includes(q)),
  );
});

// Auto-select first connected app or first app when loaded
watch(data, (val) => {
  if (val?.apps?.length && !selectedApp.value) {
    const firstConnected = val.apps.find(a => a.isConnected);
    if (firstConnected) {
      void loadApp(firstConnected);
    } else if (val.apps[0]) {
      void loadApp(val.apps[0]);
    }
  }
}, { immediate: true });

async function loadApp(app?: ComposioAppSummary) {
  selectedApp.value = app;
  selectedType.value = "";
  selectedTypeDetail.value = null;
  triggerTypes.value = [];
  triggers.value = [];
  triggerConfig.value = "{}";
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

watch(selectedType, async (slug) => {
  if (!slug || !selectedApp.value) {
    selectedTypeDetail.value = null;
    return;
  }
  const found = triggerTypes.value.find(t => t.slug === slug);
  if (found) {
    selectedTypeDetail.value = found;
    if (found.config && Object.keys(found.config).length > 0) {
      // If config schema exists, pre-fill template
      const template: Record<string, string> = {};
      const properties = (found.config as { properties?: Record<string, unknown> }).properties;
      if (properties) {
        for (const key of Object.keys(properties)) {
          template[key] = "";
        }
      }
      triggerConfig.value = JSON.stringify(template, null, 2);
    }
  }
});

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
      title: "Event trigger enabled",
      description: `${selectedType.value} is now live and listening for events.`,
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
    toast.add({
      title: trigger.disabledAt ? "Event resumed" : "Event paused",
      description: `Trigger ${id} is now ${trigger.disabledAt ? "live" : "paused"}.`,
      color: "success",
    });
    await loadApp(selectedApp.value);
  } catch (err) {
    toast.add({
      title: "Action failed",
      description: err instanceof Error ? err.message : "Could not toggle trigger",
      color: "error",
    });
  }
}

async function deleteTrigger(trigger: TriggerRecord) {
  const id = trigger.id ?? trigger.triggerId;
  if (!id) return;
  try {
    await $fetch(`/api/composio/triggers/${id}`, {
      method: "DELETE",
    });
    toast.add({
      title: "Event trigger deleted",
      description: `Trigger ${id} was permanently removed.`,
      color: "neutral",
    });
    await loadApp(selectedApp.value);
  } catch (err) {
    toast.add({
      title: "Delete failed",
      description: err instanceof Error ? err.message : "Could not delete trigger",
      color: "error",
    });
  }
}

async function connectCurrentApp() {
  if (!selectedApp.value) return;
  connectingSlug.value = selectedApp.value.slug;
  try {
    const result = await $fetch<{ redirectUrl: string }>("/api/composio/connect", {
      method: "POST",
      body: { toolkit: selectedApp.value.slug },
    });
    if (result.redirectUrl) {
      window.location.href = result.redirectUrl;
    }
  } catch (err) {
    toast.add({
      title: "Failed to connect",
      description: err instanceof Error ? err.message : "Could not generate connection link",
      color: "error",
    });
  } finally {
    connectingSlug.value = null;
  }
}
</script>

<template>
  <div class="grid min-w-0 gap-6 overflow-x-hidden lg:grid-cols-[minmax(15rem,0.8fr)_minmax(0,1.45fr)]">
    <!-- Left App Browser Sidebar -->
    <aside class="space-y-3">
      <div class="flex items-center justify-between px-1">
        <div class="flex items-center gap-1.5">
          <p class="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
            Apps & Toolkits
          </p>
          <span
            v-if="allApps.length"
            class="rounded-full bg-elevated px-1.5 py-0.5 text-[10px] text-muted border border-default"
          >
            {{ allApps.length }}
          </span>
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

      <!-- Only connected apps can receive live events -->
      <div class="space-y-2">
        <p class="text-[11px] leading-4 text-muted">{{ allApps.length }} apps · available triggers</p>
        <UInput
          v-model="appSearchQuery"
          icon="i-lucide-search"
          size="xs"
          placeholder="Filter connected apps..."
          class="w-full text-xs"
        />
      </div>

      <!-- Apps List -->
      <div class="max-h-[30rem] space-y-1 overflow-y-auto rounded-xl border border-default bg-elevated/20 p-1.5">
        <div
          v-if="pending && !allApps.length"
          class="space-y-1.5 p-2"
        >
          <USkeleton
            v-for="i in 5"
            :key="i"
            class="h-9 rounded-lg"
          />
        </div>

        <div
          v-else-if="!displayedApps.length"
          class="px-2.5 py-8 text-center text-xs text-muted"
        >
          <p v-if="!connectedApps.length">
            No connected apps with events are available yet. Connect an app from the Apps tab first.
          </p>
          <p v-else>
            No connected event apps match "{{ appSearchQuery }}".
          </p>
        </div>

        <button
          v-for="app in displayedApps"
          :key="app.slug"
          type="button"
          class="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors"
          :class="selectedApp?.slug === app.slug ? 'bg-primary/10 text-highlighted border border-primary/20' : 'text-toned hover:bg-muted/10 border border-transparent'"
          @click="loadApp(app)"
        >
          <span class="flex size-7 shrink-0 items-center justify-center rounded-md border border-default bg-default">
            <img
              v-if="app.logo"
              :src="app.logo"
              :alt="app.name"
              class="size-5 object-contain"
            >
            <UIcon
              v-else
              :name="app.icon || 'i-lucide-box'"
              class="size-4"
            />
          </span>

          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-1.5">
              <span class="truncate text-xs font-medium">{{ app.name }}</span>
              <span
                v-if="app.isConnected"
                class="size-1.5 rounded-full bg-emerald-500"
                title="Connected"
              />
            </div>
            <p class="truncate text-[10px] text-muted">
              {{ app.isConnected ? 'Connected' : 'Connect first' }}
            </p>
          </div>

          <UIcon
            name="i-lucide-chevron-right"
            class="size-3.5 text-muted shrink-0"
          />
        </button>
      </div>
    </aside>

    <!-- Right Event Triggers Section -->
    <section class="min-w-0">
      <div
        v-if="!selectedApp"
        class="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed border-default bg-elevated/15 px-6 text-center"
      >
        <UIcon
          name="i-lucide-zap"
          class="mb-3 size-7 text-muted"
        />
        <h2 class="text-sm font-medium text-highlighted">
          Choose an app
        </h2>
        <p class="mt-1 max-w-sm text-xs leading-5 text-muted">
          Select an app on the left to browse and configure event triggers that Thinky should listen to.
        </p>
      </div>

      <template v-else>
        <!-- App Header & Connection Status -->
        <div class="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-default pb-3">
          <div class="flex items-center gap-3">
            <span class="flex size-9 shrink-0 items-center justify-center rounded-lg border border-default bg-elevated">
              <img
                v-if="selectedApp.logo"
                :src="selectedApp.logo"
                :alt="selectedApp.name"
                class="size-6 object-contain"
              >
              <UIcon
                v-else
                :name="selectedApp.icon || 'i-lucide-box'"
                class="size-5"
              />
            </span>
            <div>
              <p class="text-base font-semibold text-highlighted">
                {{ selectedApp.name }} Events & Triggers
              </p>
              <p class="text-xs text-muted">
                {{ triggerTypes.length }} available events · {{ triggers.length }} enabled
              </p>
            </div>
          </div>

          <div>
            <UBadge
              v-if="selectedApp.isConnected"
              color="success"
              variant="subtle"
              size="sm"
            >
              <span class="mr-1.5 size-1.5 rounded-full bg-emerald-500" />
              Connected
            </UBadge>
            <UButton
              v-else
              color="primary"
              variant="soft"
              size="xs"
              trailing-icon="i-lucide-arrow-up-right"
              :loading="connectingSlug === selectedApp.slug"
              @click="connectCurrentApp"
            >
              Connect {{ selectedApp.name }}
            </UButton>
          </div>
        </div>

        <!-- Warning if unconnected -->
        <div
          v-if="!selectedApp.isConnected"
          class="mb-4 rounded-xl border border-dashed border-amber-500/30 bg-amber-500/5 p-3.5 text-xs text-amber-600 dark:text-amber-400"
        >
          <div class="flex items-start gap-2.5">
            <UIcon
              name="i-lucide-alert-circle"
              class="mt-0.5 size-4 shrink-0 text-amber-500"
            />
            <div class="min-w-0 flex-1">
              <p class="font-medium">
                {{ selectedApp.name }} is not connected yet
              </p>
              <p class="mt-0.5 text-[11px] opacity-90">
                You can browse available event types below. To activate a live trigger, connect your account first.
              </p>
            </div>
            <UButton
              color="warning"
              variant="solid"
              size="xs"
              :loading="connectingSlug === selectedApp.slug"
              @click="connectCurrentApp"
            >
              Connect Now
            </UButton>
          </div>
        </div>

        <!-- Enable Trigger Card -->
        <div class="mb-4 rounded-xl border border-default bg-elevated/20 p-3.5 sm:p-4">
          <div class="mb-3 flex items-center gap-2">
            <UIcon
              name="i-lucide-plus-circle"
              class="size-4 text-primary"
            />
            <p class="text-xs font-semibold text-highlighted">
              Configure New Trigger
            </p>
          </div>

          <div class="space-y-3">
            <div>
              <label class="mb-1 block text-[11px] font-medium text-muted">Select Event Type</label>
              <USelectMenu
                v-model="selectedType"
                :items="triggerTypes.map(t => ({ label: t.name || t.slug || 'Unnamed event', value: t.slug || '' }))"
                value-key="value"
                searchable
                placeholder="Search available events (e.g. commit, push, issue, email)..."
                size="sm"
              />
            </div>

            <div v-if="triggerTypes.length" class="space-y-2 pt-1">
              <div class="flex items-center justify-between px-1">
                <p class="text-[11px] font-semibold text-highlighted">{{ selectedApp.slug }} trigger types</p>
                <span class="font-mono text-[10px] text-muted">{{ triggerTypes.length }} available events</span>
              </div>
              <div
                v-for="type in triggerTypes"
                :key="type.slug"
                class="flex w-full min-w-0 items-start gap-3 rounded-lg border border-default bg-default/20 p-3 text-left transition-colors hover:border-primary/40 hover:bg-primary/5"
              >
                <UIcon name="i-lucide-webhook" class="mt-0.5 size-4 shrink-0 text-muted" />
                <span class="min-w-0 flex-1">
                  <span class="block truncate text-xs font-medium text-highlighted">{{ formatTriggerName(type) }}</span>
                  <span class="mt-1 block break-all font-mono text-[10px] text-muted">{{ type.slug }}</span>
                </span>
                <UButton type="button" size="xs" color="neutral" variant="soft" @click.stop="selectedType = type.slug || ''">Configure</UButton>
              </div>
            </div>

            <!-- Description of selected type -->
            <div
              v-if="selectedTypeDetail"
              class="rounded-lg border border-default bg-muted/20 p-2.5 text-xs"
            >
              <p class="font-medium text-highlighted">
                {{ formatTriggerName(selectedTypeDetail) }}
              </p>
              <p
                v-if="selectedTypeDetail.description"
                class="mt-0.5 text-muted text-[11px]"
              >
                {{ selectedTypeDetail.description }}
              </p>
            </div>

            <div>
              <label class="mb-1 flex items-center justify-between text-[11px] font-medium text-muted">
                <span>Trigger Config (JSON)</span>
                <span class="text-[10px] text-dimmed">Optional parameters required by provider</span>
              </label>
              <UTextarea
                v-model="triggerConfig"
                :rows="3"
                class="w-full max-w-full font-mono text-xs [&_textarea]:min-w-0 [&_textarea]:max-w-full [&_textarea]:whitespace-pre-wrap [&_textarea]:break-words"
                placeholder='Optional JSON configuration, e.g. {"owner":"octocat","repo":"hello-world"}'
              />
            </div>

            <div class="flex items-center justify-end gap-2 pt-1">
              <UButton
                color="primary"
                size="xs"
                :loading="saving"
                :disabled="!selectedType || !selectedApp.isConnected"
                @click="enableTrigger"
              >
                Enable Event Trigger
              </UButton>
            </div>
          </div>
        </div>

        <!-- Active Triggers List -->
        <div>
          <div class="mb-2 flex items-center justify-between px-1">
            <h3 class="text-xs font-semibold text-highlighted">
              Active & Configured Triggers
            </h3>
            <span class="text-[11px] text-muted">
              {{ triggers.length }} configured
            </span>
          </div>

          <div
            v-if="loading"
            class="space-y-2"
          >
            <USkeleton
              v-for="i in 3"
              :key="i"
              class="h-14 rounded-lg"
            />
          </div>

          <div
            v-else-if="triggers.length"
            class="overflow-hidden rounded-xl border border-default bg-elevated/10"
          >
            <div
              v-for="trigger in triggers"
              :key="trigger.id || trigger.triggerId"
              class="flex items-center gap-3 border-b border-default px-3 py-3 last:border-0 hover:bg-muted/5 transition-colors"
            >
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2">
                  <p class="truncate text-xs font-medium text-highlighted">
                    {{ formatTriggerName(trigger) }}
                  </p>
                  <UBadge
                    :color="trigger.disabledAt ? 'neutral' : 'success'"
                    variant="subtle"
                    size="xs"
                  >
                    {{ trigger.disabledAt ? 'Paused' : 'Active' }}
                  </UBadge>
                </div>
                <p class="mt-0.5 break-all font-mono text-[10px] text-muted">
                  {{ trigger.triggerSlug || trigger.id || trigger.triggerId }}
                </p>
              </div>

              <div class="flex items-center gap-1">
                <UButton
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  :icon="trigger.disabledAt ? 'i-lucide-play' : 'i-lucide-pause'"
                  :aria-label="trigger.disabledAt ? 'Enable trigger' : 'Pause trigger'"
                  :title="trigger.disabledAt ? 'Resume trigger' : 'Pause trigger'"
                  @click="toggleTrigger(trigger)"
                />
                <UButton
                  color="error"
                  variant="ghost"
                  size="xs"
                  icon="i-lucide-trash-2"
                  aria-label="Delete trigger"
                  title="Delete trigger permanently"
                  @click="deleteTrigger(trigger)"
                />
              </div>
            </div>
          </div>

          <div
            v-else
            class="rounded-xl border border-dashed border-default px-4 py-8 text-center text-xs text-muted"
          >
            No events configured for {{ selectedApp.name }} yet.
          </div>
        </div>
      </template>
    </section>
  </div>
</template>
