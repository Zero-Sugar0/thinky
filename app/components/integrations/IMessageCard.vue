<script setup lang="ts">
const { data: line, pending, openLink, refresh } = useIMessageLine();

const copied = ref(false);

async function copyNumber() {
  if (!line.value?.agentNumber) return;
  await navigator.clipboard.writeText(line.value.agentNumber);
  copied.value = true;
  setTimeout(() => {
    copied.value = false;
  }, 2000);
}
</script>

<template>
  <div>
    <div class="flex items-center gap-3 px-4 py-3">
      <div class="flex size-8 shrink-0 items-center justify-center rounded-md border border-default bg-elevated">
        <UIcon
          name="i-lucide-message-circle"
          class="size-4 text-toned"
        />
      </div>

      <div class="min-w-0 flex-1">
        <div class="flex items-center gap-2">
          <h3 class="text-sm text-highlighted">
            iMessage
          </h3>
          <span
            v-if="!pending && line?.phoneNumber"
            class="inline-flex items-center gap-1.5 text-[11px] text-muted"
          >
            <span class="size-1.5 shrink-0 rounded-full bg-emerald-400/90" />
            Linked
          </span>
        </div>
        <p class="truncate text-xs text-muted">
          <template v-if="!line?.agentNumber">
            The agent number is not set up yet.
          </template>
          <template v-else-if="!line?.phoneNumber">
            Save your phone number on your profile first, then text Thinky.
          </template>
          <template v-else>
            Text Thinky from {{ line.phoneNumber }}.
          </template>
        </p>
      </div>

      <div class="flex shrink-0 items-center gap-1.5">
        <UButton
          v-if="!line?.phoneNumber"
          color="neutral"
          variant="soft"
          size="xs"
          to="/settings/profile"
        >
          Add phone
        </UButton>
        <UButton
          v-else-if="openLink"
          color="neutral"
          variant="soft"
          size="xs"
          icon="i-lucide-message-circle"
          :href="openLink"
          external
        >
          Text Thinky
        </UButton>
      </div>
    </div>

    <div
      v-if="line?.agentNumber"
      class="flex flex-wrap items-center gap-2 border-t border-default px-4 py-3"
    >
      <span class="text-xs text-muted">Number:</span>
      <code class="rounded-md border border-default bg-elevated px-2.5 py-1 font-mono text-sm text-highlighted">
        {{ line.agentNumber }}
      </code>
      <UButton
        color="neutral"
        variant="ghost"
        size="xs"
        :icon="copied ? 'i-lucide-check' : 'i-lucide-copy'"
        @click="copyNumber"
      >
        {{ copied ? "Copied" : "Copy" }}
      </UButton>
      <UButton
        color="neutral"
        variant="ghost"
        size="xs"
        icon="i-lucide-refresh-cw"
        @click="refresh()"
      >
        Refresh
      </UButton>
    </div>
  </div>
</template>
