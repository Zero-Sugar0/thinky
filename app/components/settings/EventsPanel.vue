<script setup lang="ts">
import type { ComposioAppSummary } from "~~/server/utils/composio";

interface TriggerRecord { id?: string; triggerId?: string; triggerName?: string; triggerSlug?: string; disabledAt?: string | null; }
interface TriggerType { slug?: string; name?: string; description?: string; }
interface AppsResponse { apps: ComposioAppSummary[]; configured: boolean; }

const toast = useToast();
const { data, pending, error, refresh } = useFetch<AppsResponse>("/api/composio/apps", { server: false });
const selectedApp = ref<ComposioAppSummary>();
const selectedType = ref("");
const triggerConfig = ref("{}");
const triggerTypes = ref<TriggerType[]>([]);
const triggers = ref<TriggerRecord[]>([]);
const loading = ref(false);
const saving = ref(false);

const connectedApps = computed(() => (data.value?.apps ?? []).filter(app => app.isConnected));
const unconnectedApps = computed(() => (data.value?.apps ?? []).filter(app => !app.isConnected));

async function loadApp(app?: ComposioAppSummary) {
  selectedApp.value = app;
  selectedType.value = "";
  triggerTypes.value = [];
  triggers.value = [];
  if (!app) return;
  loading.value = true;
  try {
    const result = await $fetch<{ types: TriggerType[]; triggers: TriggerRecord[] }>("/api/composio/triggers", { query: { toolkit: app.slug } });
    triggerTypes.value = result.types ?? [];
    triggers.value = result.triggers ?? [];
  } catch (err) {
    toast.add({ title: "Could not load events", description: err instanceof Error ? err.message : "Try again later", color: "error" });
  } finally {
    loading.value = false;
  }
}

async function enableTrigger() {
  if (!selectedApp.value || !selectedType.value) return;
  let config: Record<string, unknown>;
  try { config = JSON.parse(triggerConfig.value || "{}"); } catch { toast.add({ title: "Invalid configuration", description: "Use a valid JSON object.", color: "error" }); return; }
  saving.value = true;
  try {
    await $fetch("/api/composio/triggers", { method: "POST", body: { slug: selectedType.value, triggerConfig: config, connectedAccountId: selectedApp.value.connectedAccountId } });
    toast.add({ title: "Event enabled", description: `${selectedType.value} is now live for Thinky.`, color: "success" });
    await loadApp(selectedApp.value);
  } catch (err) { toast.add({ title: "Could not enable event", description: err instanceof Error ? err.message : "Try again later", color: "error" }); }
  finally { saving.value = false; }
}

async function toggleTrigger(trigger: TriggerRecord) {
  const id = trigger.id ?? trigger.triggerId;
  if (!id) return;
  await $fetch(`/api/composio/triggers/${id}`, { method: "PATCH", body: { enabled: Boolean(trigger.disabledAt) } });
  await loadApp(selectedApp.value);
}

async function deleteTrigger(trigger: TriggerRecord) {
  const id = trigger.id ?? trigger.triggerId;
  if (!id) return;
  await $fetch(`/api/composio/triggers/${id}`, { method: "DELETE" });
  await loadApp(selectedApp.value);
}
</script>

<template>
  <div class="grid gap-6 lg:grid-cols-[minmax(13rem,0.72fr)_minmax(0,1.45fr)]">
    <aside class="space-y-2">
      <div class="flex items-center justify-between px-1">
        <p class="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">Connected apps</p>
        <UButton size="xs" color="neutral" variant="ghost" icon="i-lucide-refresh-cw" :loading="pending" aria-label="Refresh apps" @click="() => refresh()" />
      </div>
      <div class="space-y-1 rounded-xl border border-default bg-elevated/20 p-1.5">
        <button v-for="app in connectedApps" :key="app.slug" type="button" class="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors" :class="selectedApp?.slug === app.slug ? 'bg-primary/10 text-highlighted' : 'text-toned hover:bg-muted/10'" @click="loadApp(app)">
          <span class="flex size-7 shrink-0 items-center justify-center rounded-md border border-default bg-default"><img v-if="app.logo" :src="app.logo" :alt="app.name" class="size-5 object-contain"><UIcon v-else :name="app.icon || 'i-lucide-box'" class="size-4" /></span>
          <span class="min-w-0 flex-1 truncate text-xs font-medium">{{ app.name }}</span>
          <UIcon name="i-lucide-chevron-right" class="size-3.5 text-muted" />
        </button>
        <p v-if="!connectedApps.length" class="px-2.5 py-5 text-center text-xs text-muted">Connect an app first to enable its events.</p>
      </div>
      <p v-if="unconnectedApps.length" class="px-1 text-[11px] leading-5 text-muted">{{ unconnectedApps.length }} available apps are not connected yet. Connect them from the Apps tab before enabling events.</p>
    </aside>

    <section class="min-w-0">
      <div v-if="!selectedApp" class="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed border-default bg-elevated/15 px-6 text-center"><UIcon name="i-lucide-zap" class="mb-3 size-7 text-muted" /><h2 class="text-sm font-medium text-highlighted">Choose an app</h2><p class="mt-1 max-w-sm text-xs leading-5 text-muted">Select a connected app to browse every event it can send to Thinky.</p></div>
      <template v-else>
        <div class="mb-4 flex items-start justify-between gap-3"><div><p class="text-base font-semibold text-highlighted">{{ selectedApp.name }} events</p><p class="mt-1 text-xs text-muted">{{ triggerTypes.length }} available event types · {{ triggers.length }} enabled</p></div><UBadge color="success" variant="subtle" size="sm"><span class="mr-1.5 size-1.5 rounded-full bg-emerald-500" /> Connected</UBadge></div>
        <div class="mb-4 rounded-xl border border-default bg-elevated/20 p-3 sm:p-4"><div class="mb-3 flex items-center gap-2"><UIcon name="i-lucide-plus-circle" class="size-4 text-primary" /><p class="text-xs font-semibold text-highlighted">Enable an event</p></div><USelectMenu v-model="selectedType" :items="triggerTypes.map(type => ({ label: type.name || type.slug || '', value: type.slug || '' }))" value-key="value" searchable placeholder="Search all available events" size="sm" /><UTextarea v-model="triggerConfig" :rows="3" class="mt-2 font-mono text-xs" placeholder='Optional JSON configuration, e.g. {"calendar_id":"primary"}' /><UButton class="mt-2" color="primary" size="sm" :loading="saving" :disabled="!selectedType" @click="enableTrigger">Enable event</UButton></div>
        <div v-if="loading" class="space-y-2"><USkeleton v-for="i in 4" :key="i" class="h-12 rounded-lg" /></div>
        <div v-else-if="triggers.length" class="overflow-hidden rounded-xl border border-default"><div v-for="trigger in triggers" :key="trigger.id || trigger.triggerId" class="flex items-center gap-3 border-b border-default px-3 py-3 last:border-0"><div class="min-w-0 flex-1"><p class="truncate text-xs font-medium text-highlighted">{{ trigger.triggerName || trigger.triggerSlug || 'Event trigger' }}</p><p class="mt-0.5 truncate text-[11px] text-muted">{{ trigger.id || trigger.triggerId }}</p></div><UBadge :color="trigger.disabledAt ? 'neutral' : 'success'" variant="subtle" size="sm">{{ trigger.disabledAt ? 'Paused' : 'Live' }}</UBadge><UButton color="neutral" variant="ghost" size="xs" :icon="trigger.disabledAt ? 'i-lucide-play' : 'i-lucide-pause'" :aria-label="trigger.disabledAt ? 'Enable event' : 'Pause event'" @click="toggleTrigger(trigger)" /><UButton color="error" variant="ghost" size="xs" icon="i-lucide-trash-2" aria-label="Delete event" @click="deleteTrigger(trigger)" /></div></div>
        <div v-else class="rounded-xl border border-dashed border-default px-4 py-8 text-center text-xs text-muted">No events enabled for {{ selectedApp.name }} yet.</div>
      </template>
    </section>
  </div>
</template>
