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

// Kept for signed-link refresh bookkeeping; expiry is intentionally not shown in the card.
// const expiresIn = computed(() => {
//   if (refreshedExpiresIn.value) return refreshedExpiresIn.value;
//   const output = props.invocation.output;
//   if (!output) return 600;
//   return output.liveViewerExpiresInSeconds ?? output.expiresInSeconds ?? 600;
// });

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
    class="my-3 w-full max-w-3xl overflow-hidden bg-transparent"
    aria-label="Live browser view"
  >
    <div
      v-if="viewerUrl && (!active || refreshedUrl)"
      class="h-[calc(100dvh-9rem)] min-h-[240px] w-full bg-transparent sm:h-[360px]"
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
    <!-- Signed-link expiry and refresh handling stay in code, but the viewer owns its toolbar and the card stays chrome-free. -->
  </section>
</template>
