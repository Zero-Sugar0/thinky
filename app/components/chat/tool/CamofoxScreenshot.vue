<script setup lang="ts">
import type { CamofoxScreenshotUIToolInvocation } from "~~/shared/utils/tools/camofox";

const props = defineProps<{
  invocation: CamofoxScreenshotUIToolInvocation;
}>();

const imageFailed = ref(false);
const screenshotUrl = ref<string>();
watch(
  () => props.invocation.output?.screenshotBase64,
  (screenshotBase64, _previous, onCleanup) => {
    imageFailed.value = false;
    const output = props.invocation.output;
    if (!output || !screenshotBase64) {
      screenshotUrl.value = undefined;
      return;
    }

    const binary = atob(screenshotBase64);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    const objectUrl = URL.createObjectURL(new Blob([bytes], { type: output.mimeType }));
    screenshotUrl.value = objectUrl;
    onCleanup(() => URL.revokeObjectURL(objectUrl));
  },
  { immediate: true },
);
const filename = computed(() => {
  const extension = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  }[props.invocation.output?.mimeType ?? "image/png"] ?? "png";
  return `browser-screenshot.${extension}`;
});
</script>

<template>
  <figure class="my-3 w-full max-w-3xl overflow-hidden rounded-xl border border-default bg-elevated">
    <img
      v-if="screenshotUrl"
      :src="screenshotUrl"
      alt="Screenshot of the current browser tab"
      class="block h-auto max-h-[75vh] w-full object-contain"
      @error="imageFailed = true"
    >
    <div
      v-else-if="!invocation.output"
      class="p-4 text-sm"
      :class="invocation.errorText ? 'text-error' : 'text-muted'"
      role="status"
    >
      {{ invocation.errorText ?? "Capturing browser screenshot..." }}
    </div>
    <div
      v-else-if="imageFailed"
      class="p-4 text-sm text-error"
      role="alert"
    >
      The screenshot data was received but this browser could not display it.
      Try downloading the image to inspect the file.
    </div>
    <figcaption
      v-if="invocation.output"
      class="flex items-center justify-between gap-3 border-t border-default px-3 py-2 text-xs text-muted"
    >
      <span>Browser screenshot · {{ Math.ceil(invocation.output.bytes / 1024) }} KB</span>
      <a
        :href="screenshotUrl"
        :download="filename"
        class="text-primary hover:underline"
      >
        Download
      </a>
    </figcaption>
  </figure>
</template>
