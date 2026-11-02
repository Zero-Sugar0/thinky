<script setup lang="ts">
import type { CamofoxOpenUIToolInvocation } from "~~/shared/utils/tools/camofox";

const props = defineProps<{
  invocation: CamofoxOpenUIToolInvocation;
}>();

const viewerUrl = computed(() => {
  const value = props.invocation.output?.liveViewerUrl ?? props.invocation.output?.url;
  if (!value) return undefined;

  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.searchParams.has("t") ? url.toString() : undefined;
  } catch {
    return undefined;
  }
});

const expiresIn = computed(() => {
  const output = props.invocation.output;
  if (!output) return 120;
  return output.liveViewerExpiresInSeconds ?? output.expiresInSeconds ?? 120;
});
</script>

<template>
  <section
    class="my-3 w-full max-w-3xl overflow-hidden rounded-xl border border-default bg-elevated"
    aria-label="Live browser view"
  >
    <div
      v-if="viewerUrl"
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
      <template v-if="invocation.output?.liveViewerError">
        Browser opened, but live view is unavailable: {{ invocation.output.liveViewerError }}
      </template>
      <template v-else-if="invocation.errorText">
        {{ invocation.errorText }}
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
      <span class="break-words">Live browser · link expires in about {{ expiresIn }} seconds</span>
      <a
        v-if="viewerUrl"
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
