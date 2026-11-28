<script setup lang="ts">
import { telegramStartLink } from "~~/shared/telegram-link";

const {
  data: telegramLink,
  pending,
  error,
  isLinked,
  pendingCode,
  generating,
  generateLinkCode,
  unlinkTelegram,
} = useTelegramLink();

const unlinking = ref(false);
const copied = ref(false);

const botLabel = computed(() => {
  const username = telegramLink.value?.botUsername;
  return username ? `@${username}` : "your Thinky bot";
});

const startLink = computed(() => {
  const username = telegramLink.value?.botUsername;
  const code = pendingCode.value ?? telegramLink.value?.pendingCode;
  return username && code ? telegramStartLink(username, code) : undefined;
});
const expiresLabel = computed(() => {
  const expiresAt = telegramLink.value?.pendingExpiresAt;
  if (!expiresAt) {
    return undefined;
  }

  const minutes = Math.max(1, Math.round((new Date(expiresAt).getTime() - Date.now()) / 60_000));
  return `Expires in ${minutes} min`;
});

async function onUnlink() {
  unlinking.value = true;
  try {
    await unlinkTelegram();
  }
  finally {
    unlinking.value = false;
  }
}

async function copyCode() {
  const code = pendingCode.value ?? telegramLink.value?.pendingCode;
  if (!code) {
    return;
  }

  await navigator.clipboard.writeText(`link ${code}`);
  copied.value = true;
  setTimeout(() => {
    copied.value = false;
  }, 2000);
}
</script>

<template>
  <div>
    <div class="flex items-center gap-3 px-4 py-3">
      <div
        class="flex size-8 shrink-0 items-center justify-center rounded-md border border-default bg-elevated"
      >
        <UIcon
          name="i-simple-icons-telegram"
          class="size-4 text-toned"
        />
      </div>

      <div class="min-w-0 flex-1">
        <div class="flex items-center gap-2">
          <h3 class="text-sm text-highlighted">
            Telegram
          </h3>
          <span
            v-if="!pending"
            class="inline-flex items-center gap-1.5 text-[11px] text-muted"
          >
            <span
              class="size-1.5 shrink-0 rounded-full"
              :class="isLinked
                ? 'bg-emerald-400/90'
                : 'bg-toned'"
            />
            {{ isLinked ? "Linked" : "Not linked" }}
          </span>
        </div>
        <p class="truncate text-xs text-muted">
          <template v-if="isLinked && telegramLink?.displayName">
            {{ telegramLink.displayName }}
            <span
              v-if="telegramLink.username"
              class="text-dimmed"
            > · @{{ telegramLink.username }}</span>
          </template>
          <template v-else>
            Message {{ botLabel }} with your profile and integrations.
          </template>
        </p>
      </div>

      <div class="flex shrink-0 items-center gap-1.5">
        <UButton
          v-if="isLinked"
          color="neutral"
          variant="ghost"
          size="xs"
          icon="i-lucide-unlink"
          :loading="unlinking"
          aria-label="Unlink Telegram"
          @click="onUnlink"
        />
        <UButton
          v-else
          color="neutral"
          variant="soft"
          size="xs"
          :loading="generating || pending"
          @click="generateLinkCode"
        >
          {{ pendingCode ? "New code" : "Generate code" }}
        </UButton>
      </div>
    </div>

    <div
      v-if="!isLinked && pendingCode"
      class="border-t border-default px-4 py-3"
    >
      <ol class="space-y-2 text-xs text-muted">
        <li class="flex gap-2">
          <span class="text-dimmed">1.</span>
          <span v-if="startLink">Tap Open Telegram below and press Start. The code is sent for you.</span>
          <span v-else>Open a private chat with {{ botLabel }} on Telegram and send <code class="text-toned">link {{ pendingCode }}</code></span>
        </li>
        <li class="flex gap-2">
          <span class="text-dimmed">2.</span>
          <span>Refresh this page once Thinky confirms the link</span>
        </li>
      </ol>

      <div class="mt-3 flex items-center gap-2">
        <UButton
          v-if="startLink"
          as="a"
          :href="startLink"
          target="_blank"
          rel="noopener noreferrer"
          size="xs"
          icon="i-simple-icons-telegram"
        >
          Open Telegram
        </UButton>
        <code class="rounded-md border border-default bg-elevated px-2.5 py-1 font-mono text-sm tracking-widest text-highlighted">
          {{ pendingCode }}
        </code>
        <UButton
          color="neutral"
          variant="ghost"
          size="xs"
          :icon="copied ? 'i-lucide-check' : 'i-lucide-copy'"
          @click="copyCode"
        >
          {{ copied ? "Copied" : "Copy" }}
        </UButton>
        <span
          v-if="expiresLabel"
          class="text-[11px] text-dimmed"
        >{{ expiresLabel }}</span>
      </div>
    </div>

    <p
      v-if="error"
      class="border-t border-default px-4 py-2 text-xs text-error"
    >
      {{ error.message }}
    </p>
  </div>
</template>
