<script setup lang="ts">
import type { CamofoxOpenUIToolInvocation } from "~~/shared/utils/tools/camofox";

const props = defineProps<{
  invocation: CamofoxOpenUIToolInvocation;
  active?: boolean;
}>();

const refreshedUrl = ref<string>();
const refreshedExpiresIn = ref<number>();
const refreshFailed = ref(false);
const refreshPending = ref(false);
const viewerUrl = computed(() => {
  const value = refreshedUrl.value
    ?? props.invocation.output?.liveViewerUrl
    ?? props.invocation.output?.url;
  if (!value) return undefined;

  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.searchParams.has("t") ? url.toString() : undefined;
  } catch {
    return undefined;
  }
});

const expiresIn = computed(() => {
  if (refreshedExpiresIn.value) return refreshedExpiresIn.value;
  const output = props.invocation.output;
  if (!output) return 120;
  return output.liveViewerExpiresInSeconds ?? output.expiresInSeconds ?? 120;
});

const tabId = computed(
  () => props.invocation.output?.tabId ?? props.invocation.input?.tabId,
);

watch(
  [
    () => props.invocation.output?.liveViewerUrl ?? props.invocation.output?.url,
    tabId,
  ],
  () => {
    refreshedUrl.value = undefined;
    refreshedExpiresIn.value = undefined;
    refreshFailed.value = false;
  },
  { immediate: true },
);

watch(
  [() => props.active, tabId],
  ([active, id], _previous, onCleanup) => {
    if (!active || !id || import.meta.server) return;

    let disposed = false;
    let refreshing = false;
    const refreshLink = async () => {
      if (refreshing || disposed) return;
      refreshing = true;
      refreshPending.value = true;
      try {
        const result = await $fetch<{ url: string; expiresInSeconds: number }>(
          "/api/camofox/live-viewer",
          { method: "POST", body: { tabId: id } },
        );
        const url = new URL(result.url);
        if (url.protocol !== "https:" || !url.searchParams.has("t")) {
          throw new Error("Invalid viewer URL");
        }
        if (!disposed) {
          refreshedUrl.value = url.toString();
          refreshedExpiresIn.value = result.expiresInSeconds;
          refreshFailed.value = false;
        }
      } catch {
        if (!disposed) refreshFailed.value = true;
      } finally {
        refreshing = false;
        if (!disposed) refreshPending.value = false;
      }
    };

    void refreshLink();
    const timer = window.setInterval(() => void refreshLink(), 75_000);
    onCleanup(() => {
      disposed = true;
      window.clearInterval(timer);
      refreshPending.value = false;
    });
  },
  { immediate: true },
);
</script>

<template>
  <section
    class="my-3 w-full max-w-3xl overflow-hidden rounded-xl border border-default bg-elevated"
    aria-label="Live browser view"
  >
    <div
      v-if="viewerUrl && (!active || refreshedUrl)"
      class="aspect-[4/3] bg-black sm:aspect-video"
    >
      <iframe
        :key="viewerUrl"
        :src="viewerUrl"
        title="Live view of the browser tab"
        class="h-full w-full border-0"
        referrerpolicy="no-referrer"
        sandbox="allow-scripts allow-same-origin allow-forms"
      />
    </div>
    <div
      v-else
      class="p-4 text-sm"
      :class="invocation.errorText || invocation.output?.liveViewerError ? 'text-error' : 'text-muted'"
      role="status"
    >
      <template v-if="refreshPending">
        Preparing live view...
      </template>
      <template v-else-if="invocation.output?.liveViewerError">
        Browser opened, but live view is unavailable: {{ invocation.output.liveViewerError }}
      </template>
      <template v-else-if="invocation.errorText">
        {{ invocation.errorText }}
      </template>
      <template v-else-if="refreshFailed">
        Could not refresh the live view. Reopen the browser to try again.
      </template>
      <template v-else-if="invocation.output">
        The browser opened, but no valid signed live-view URL was returned.
      </template>
      <template v-else>
        Opening the browser and preparing its live view...
      </template>
    </div>
    <footer
      v-if="invocation.output"
      class="flex flex-col gap-1 border-t border-default px-3 py-2 text-xs text-muted sm:flex-row sm:items-center sm:justify-between sm:gap-3"
    >
      <span class="break-words">
        {{ active ? "Live view auto-refreshes while the agent is working" : `Live view link expires in ${expiresIn} seconds` }}
        <span
          v-if="refreshFailed"
          class="text-error"
        > · could not refresh</span>
      </span>
      <a
        v-if="viewerUrl && (!active || refreshedUrl)"
        :href="viewerUrl"
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex min-h-11 items-center self-start rounded-md text-primary hover:underline sm:min-h-0 sm:self-auto"
      >
        Open in new tab
      </a>
    </footer>
  </section>
</template>
