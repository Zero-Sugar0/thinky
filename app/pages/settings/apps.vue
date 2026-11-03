<script setup lang="ts">
import type { ComposioAppSummary } from "~~/server/utils/composio";

interface ComposioAppsResponse {
  configured: boolean;
  apps: ComposioAppSummary[];
  totalCount: number;
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

// Pagination
const currentPage = ref(1);
const pageSize = 12;

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
  return `${connectedCount.value} connected · ${filteredApps.value.length} apps available`;
});

// Client-side pagination over filtered results
const totalPages = computed(() => Math.max(1, Math.ceil(filteredApps.value.length / pageSize)));

const paginatedApps = computed(() => {
  const start = (currentPage.value - 1) * pageSize;
  return filteredApps.value.slice(start, start + pageSize);
});

watch([searchQuery, selectedCategory], () => {
  currentPage.value = 1;
});

async function connectApp(app: ComposioAppSummary) {
  try {
    connectingSlug.value = app.slug;
    const res = await $fetch<{ redirectUrl: string }>("/api/composio/connect", {
      method: "POST",
      body: {
        toolkitSlug: app.slug,
      },
    });

    window.location.assign(res.redirectUrl);
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

onMounted(async () => {
  const status = typeof route.query.status === "string" ? route.query.status : undefined;
  if (status === "success" || route.query.connected) {
    await refresh();
    const appSlug = typeof route.query.app === "string" ? route.query.app : undefined;
    const appName = apps.value.find(app => app.slug === appSlug)?.name
      ?? appSlug?.replaceAll("_", " ")
      ?? "App";
    toast.add({
      title: `${appName} connected`,
      description: "You can now use this app with Thinky.",
      color: "success",
      icon: "i-lucide-check-circle",
    });
    void router.replace({ query: {} });
  } else if (status === "failed") {
    toast.add({
      title: "App connection was not completed",
      description: "You can try connecting the app again.",
      color: "error",
    });
    void router.replace({ query: {} });
  }
});
</script>

<template>
  <div class="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
    <UDashboardPanel
      id="apps"
      class="min-h-0 flex-1 overflow-y-auto"
      :ui="{ body: 'p-0 sm:p-0' }"
    >
      <template #header>
        <AppNavbar />
      </template>

      <template #body>
        <div class="mx-auto w-full max-w-5xl px-3 pb-8 pt-[calc(var(--ui-header-height,3.5rem)+1.5rem)] sm:px-6 sm:pb-12 sm:pt-[calc(var(--ui-header-height,3.5rem)+2rem)]">
          <header class="mb-6 sm:mb-8">
            <h1 class="mb-1 text-base font-medium text-highlighted sm:text-lg">
              Settings
            </h1>
            <p class="max-w-lg text-xs text-muted sm:text-sm">
              Manage your identity, memory, integrations, and connected apps.
            </p>
          </header>

          <SettingsNav class="mb-6 sm:mb-8" />

          <div class="space-y-6 sm:space-y-8">
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
                  class="px-3 py-3 sm:px-4 sm:py-4"
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
                  class="space-y-2 px-3 py-3 sm:px-4"
                >
                  <USkeleton class="h-12 rounded-md sm:h-14" />
                  <USkeleton class="h-12 rounded-md sm:h-14" />
                  <USkeleton class="h-12 rounded-md sm:h-14" />
                </div>

                <div
                  v-else-if="error"
                  class="px-3 py-3 sm:px-4"
                >
                  <UAlert
                    color="error"
                    variant="subtle"
                    title="Failed to load apps"
                    :description="error.message"
                  />
                </div>

                <template v-else>
                  <div class="border-b border-default px-3 py-2.5 sm:px-4 space-y-2">
                    <UInput
                      v-model="searchQuery"
                      icon="i-lucide-search"
                      size="xs"
                      placeholder="Search apps (e.g. Gmail, Calendar, Slack)..."
                      class="w-full text-xs"
                    />
                    <div class="flex flex-wrap gap-1">
                      <UButton
                        v-for="cat in categories"
                        :key="cat.id"
                        size="xs"
                        class="text-[11px] px-2 py-0.5 h-6"
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
                    class="px-4 py-8 text-center text-xs text-muted"
                  >
                    No apps found matching "{{ searchQuery }}".
                  </div>

                  <div class="divide-y divide-default">
                    <div
                      v-for="app in paginatedApps"
                      :key="app.slug"
                      class="flex items-center gap-2.5 px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3 transition-colors hover:bg-muted/5"
                    >
                      <div class="flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-md border border-default bg-elevated sm:size-8">
                        <img
                          v-if="app.logo && !failedLogos[app.slug]"
                          :src="app.logo"
                          :alt="app.name"
                          class="size-5 sm:size-6 object-contain"
                          @error="failedLogos[app.slug] = true"
                        >
                        <UIcon
                          v-else
                          :name="app.icon || 'i-lucide-box'"
                          class="size-4 sm:size-5 text-toned"
                        />
                      </div>

                      <div class="min-w-0 flex-1">
                        <div class="flex items-center gap-1.5 sm:gap-2">
                          <h2 class="text-xs font-medium text-highlighted sm:text-sm">
                            {{ app.name }}
                          </h2>
                          <span
                            v-if="app.isConnected"
                            class="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-1.5 py-0.2 text-[9px] font-medium text-emerald-500 sm:text-[10px]"
                          >
                            <span class="size-1 rounded-full bg-emerald-500 sm:size-1.5" />
                            Connected
                          </span>
                        </div>
                        <p class="truncate text-[11px] text-muted sm:text-xs">
                          {{ app.description || `${app.name} toolkit actions and tools.` }}
                        </p>
                      </div>

                      <div class="flex shrink-0 items-center">
                        <UButton
                          v-if="!app.isConnected"
                          color="neutral"
                          variant="soft"
                          size="xs"
                          class="text-xs px-2 py-1"
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
                  </div>

                  <!-- Pagination Controls -->
                  <div
                    v-if="totalPages > 1"
                    class="flex items-center justify-between border-t border-default px-3 py-2 text-xs text-muted sm:px-4"
                  >
                    <span>
                      Page {{ currentPage }} of {{ totalPages }}
                    </span>
                    <div class="flex items-center gap-1">
                      <UButton
                        color="neutral"
                        variant="ghost"
                        size="xs"
                        icon="i-lucide-chevron-left"
                        :disabled="currentPage <= 1"
                        aria-label="Previous page"
                        @click="currentPage--"
                      />
                      <UButton
                        color="neutral"
                        variant="ghost"
                        size="xs"
                        icon="i-lucide-chevron-right"
                        :disabled="currentPage >= totalPages"
                        aria-label="Next page"
                        @click="currentPage++"
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
          size="xs"
          @click="appToDisconnect = null"
        >
          Cancel
        </UButton>
        <UButton
          color="error"
          size="xs"
          :loading="Boolean(disconnectingId)"
          @click="confirmDisconnect"
        >
          Disconnect
        </UButton>
      </template>
    </UModal>
  </div>
</template>
