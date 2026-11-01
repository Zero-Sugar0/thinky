<script setup lang="ts">
import type { ComposioAppSummary } from "~~/server/utils/composio";

interface ComposioAppsResponse {
  configured: boolean;
  apps: ComposioAppSummary[];
}

const toast = useToast();
const route = useRoute();
const router = useRouter();

const searchQuery = ref("");
const selectedCategory = ref("all");
const failedLogos = ref<Record<string, boolean>>({});
const connectingSlug = ref<string | null>(null);
const disconnectingId = ref<string | null>(null);
const appToDisconnect = ref<ComposioAppSummary | null>(null);

const categories = [
  { id: "all", label: "All" },
  { id: "productivity", label: "Productivity" },
  { id: "communication", label: "Communication" },
  { id: "developer", label: "Developer" },
  { id: "project-management", label: "Project Mgmt" },
];

const { data, pending, error, refresh } = useFetch<ComposioAppsResponse>("/api/composio/apps", {
  server: false,
});

const isConfigured = computed(() => data.value?.configured ?? true);
const apps = computed(() => data.value?.apps ?? []);

const filteredApps = computed(() => {
  let list = apps.value;

  if (selectedCategory.value !== "all") {
    const cat = selectedCategory.value.toLowerCase();
    list = list.filter((app) => {
      const slug = app.slug.toLowerCase();
      if (cat === "communication") {
        return ["gmail", "slack", "discord", "zoom", "twitter"].includes(slug)
          || app.categories.some(c => c.toLowerCase().includes("communication") || c.toLowerCase().includes("email"));
      }
      if (cat === "developer") {
        return ["github", "linear", "jira"].includes(slug)
          || app.categories.some(c => c.toLowerCase().includes("developer") || c.toLowerCase().includes("dev"));
      }
      if (cat === "productivity") {
        return ["googlecalendar", "notion", "google_docs", "google_sheets", "airtable"].includes(slug)
          || app.categories.some(c => c.toLowerCase().includes("productivity"));
      }
      if (cat === "project-management") {
        return ["linear", "jira", "trello", "asana", "clickup"].includes(slug)
          || app.categories.some(c => c.toLowerCase().includes("project"));
      }
      return app.categories.some(c => c.toLowerCase().includes(cat));
    });
  }

  if (!searchQuery.value.trim()) {
    return list;
  }
  const query = searchQuery.value.toLowerCase().trim();
  return list.filter(
    app =>
      app.name.toLowerCase().includes(query)
      || app.slug.toLowerCase().includes(query)
      || app.description.toLowerCase().includes(query)
      || app.categories.some(c => c.toLowerCase().includes(query)),
  );
});

const connectedCount = computed(
  () => apps.value.filter(app => app.isConnected).length,
);

const appsDescription = computed(() => {
  if (pending.value && !data.value) {
    return "Connect apps and services to enable actions in Thinky.";
  }
  return `${connectedCount.value} of ${apps.value.length} connected · Powered by Composio's tool router.`;
});

async function connectApp(app: ComposioAppSummary) {
  try {
    connectingSlug.value = app.slug;
    const res = await $fetch<{ redirectUrl?: string }>("/api/composio/connect", {
      method: "POST",
      body: { toolkitSlug: app.slug },
    });

    if (res.redirectUrl) {
      window.location.href = res.redirectUrl;
    } else {
      toast.add({
        title: "Connection initiated",
        description: `Please follow the instructions to connect ${app.name}.`,
        color: "info",
      });
      await refresh();
    }
  } catch (err) {
    toast.add({
      title: `Failed to connect ${app.name}`,
      description: err instanceof Error ? err.message : "An error occurred",
      color: "error",
    });
  } finally {
    connectingSlug.value = null;
  }
}

async function confirmDisconnect() {
  if (!appToDisconnect.value?.connectedAccountId) {
    return;
  }

  const app = appToDisconnect.value;
  try {
    disconnectingId.value = app.connectedAccountId ?? null;
    await $fetch("/api/composio/disconnect", {
      method: "DELETE",
      body: { connectedAccountId: app.connectedAccountId },
    });

    toast.add({
      title: `${app.name} disconnected`,
      description: "Account connection was removed.",
      color: "success",
    });

    appToDisconnect.value = null;
    await refresh();
  } catch (err) {
    toast.add({
      title: `Failed to disconnect ${app.name}`,
      description: err instanceof Error ? err.message : "An error occurred",
      color: "error",
    });
  } finally {
    disconnectingId.value = null;
  }
}

onMounted(() => {
  if (route.query.status === "success" || route.query.connected) {
    toast.add({
      title: "App connected successfully",
      description: "You can now use this app with Thinky.",
      color: "success",
      icon: "i-lucide-check-circle",
    });
    void router.replace({ query: {} });
  }
});
</script>

<template>
  <div>
    <UDashboardPanel
      id="apps"
      class="min-h-0"
      :ui="{ body: 'p-0 sm:p-0' }"
    >
      <template #header>
        <AppNavbar />
      </template>

      <template #body>
        <div class="mx-auto w-full max-w-2xl px-6 py-8">
          <header class="mb-8">
            <h1 class="mb-1 text-lg font-medium text-highlighted">
              Settings
            </h1>
            <p class="max-w-lg text-sm text-muted">
              Manage your identity, memory, integrations, and connected apps.
            </p>
          </header>

          <SettingsNav class="mb-8" />

          <div class="space-y-8">
            <SettingsSection
              title="Connected Apps"
              :description="appsDescription"
            >
              <template #actions>
                <UButton
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  icon="i-lucide-refresh-cw"
                  :loading="pending"
                  aria-label="Refresh apps"
                  @click="() => refresh()"
                />
              </template>

              <template #default>
                <div
                  v-if="!isConfigured"
                  class="px-4 py-4"
                >
                  <UAlert
                    color="warning"
                    variant="subtle"
                    title="Composio API Key Required"
                    description="To enable 1700+ app connections with Composio, set COMPOSIO_API_KEY in your environment variables."
                  />
                </div>

                <div
                  v-else-if="pending && !data"
                  class="space-y-3 px-4 py-3"
                >
                  <USkeleton class="h-14 rounded-md" />
                  <USkeleton class="h-14 rounded-md" />
                  <USkeleton class="h-14 rounded-md" />
                </div>

                <div
                  v-else-if="error"
                  class="px-4 py-3"
                >
                  <UAlert
                    color="error"
                    variant="subtle"
                    title="Failed to load apps"
                    :description="error.message"
                  />
                </div>

                <template v-else>
                  <div class="border-b border-default px-4 py-2.5 space-y-2.5">
                    <UInput
                      v-model="searchQuery"
                      icon="i-lucide-search"
                      size="sm"
                      placeholder="Search apps (e.g. Gmail, Google Calendar, Notion)..."
                      class="w-full"
                    />
                    <div class="flex flex-wrap gap-1">
                      <UButton
                        v-for="cat in categories"
                        :key="cat.id"
                        size="xs"
                        :color="selectedCategory === cat.id ? 'primary' : 'neutral'"
                        :variant="selectedCategory === cat.id ? 'soft' : 'ghost'"
                        @click="selectedCategory = cat.id"
                      >
                        {{ cat.label }}
                      </UButton>
                    </div>
                  </div>

                  <div
                    v-if="filteredApps.length === 0"
                    class="px-4 py-8 text-center text-sm text-muted"
                  >
                    No apps found matching "{{ searchQuery }}".
                  </div>

                  <div
                    v-for="app in filteredApps"
                    :key="app.slug"
                    class="flex items-center gap-3 border-b border-default px-4 py-3 last:border-b-0"
                  >
                    <div class="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-md border border-default bg-elevated">
                      <img
                        v-if="app.logo && !failedLogos[app.slug]"
                        :src="app.logo"
                        :alt="app.name"
                        class="size-6 object-contain"
                        @error="failedLogos[app.slug] = true"
                      >
                      <UIcon
                        v-else
                        :name="app.icon || 'i-lucide-box'"
                        class="size-5 text-toned"
                      />
                    </div>

                    <div class="min-w-0 flex-1">
                      <div class="flex items-center gap-2">
                        <h2 class="text-sm font-medium text-highlighted">
                          {{ app.name }}
                        </h2>
                        <span
                          v-if="app.isConnected"
                          class="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-500"
                        >
                          <span class="size-1.5 rounded-full bg-emerald-500" />
                          Connected
                        </span>
                      </div>
                      <p class="truncate text-xs text-muted">
                        {{ app.description || `${app.name} toolkit actions and tools.` }}
                      </p>
                    </div>

                    <div class="flex shrink-0 items-center">
                      <UButton
                        v-if="!app.isConnected"
                        color="neutral"
                        variant="soft"
                        size="xs"
                        :loading="connectingSlug === app.slug"
                        trailing-icon="i-lucide-arrow-up-right"
                        @click="connectApp(app)"
                      >
                        Connect
                      </UButton>
                      <UButton
                        v-else
                        color="neutral"
                        variant="ghost"
                        size="xs"
                        icon="i-lucide-unplug"
                        aria-label="Disconnect app"
                        @click="appToDisconnect = app"
                      />
                    </div>
                  </div>
                </template>
              </template>
            </SettingsSection>
          </div>
        </div>
      </template>
    </UDashboardPanel>

    <UModal
      :open="Boolean(appToDisconnect)"
      :title="`Disconnect ${appToDisconnect?.name}?`"
      description="Thinky will lose access to this app until you connect it again."
      @update:open="(val: boolean) => { if (!val) appToDisconnect = null; }"
    >
      <template #footer>
        <UButton
          color="neutral"
          variant="ghost"
          @click="appToDisconnect = null"
        >
          Cancel
        </UButton>
        <UButton
          color="error"
          size="sm"
          :loading="Boolean(disconnectingId)"
          @click="confirmDisconnect"
        >
          Disconnect
        </UButton>
      </template>
    </UModal>
  </div>
</template>
