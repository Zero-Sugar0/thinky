import type { TelegramLinkSummary } from "#shared/types/telegram-link";

export function useTelegramLink() {
  const toast = useToast();

  const { data, pending, error, refresh } = useFetch<TelegramLinkSummary>("/api/telegram/link", {
    server: false,
    ...payloadCacheOptions,
  });

  const isLinked = computed(() => data.value?.linked === true);
  const pendingCode = computed(() => data.value?.pendingCode);
  const generating = ref(false);

  async function generateLinkCode() {
    generating.value = true;
    try {
      const { code } = await $fetch<{ code: string; expiresAt: string }>("/api/telegram/link/code", { method: "POST" });
      await refresh();
      // Show the code in the toast too, so it is visible even when the card is covered.
      toast.add({
        title: `Your link code: ${code}`,
        description: `In Telegram, message your Thinky bot: link ${code}`,
        color: "success",
        icon: "i-lucide-link",
        duration: 0,
      });
    }
    catch (cause) {
      toast.add({
        title: "Could not generate code",
        description: cause instanceof Error ? cause.message : "Try again.",
        color: "error",
        icon: "i-lucide-alert-circle",
      });
    }
    finally {
      generating.value = false;
    }
  }

  async function unlinkTelegram() {
    await $fetch("/api/telegram/link", { method: "DELETE" });
    await refresh();
  }

  return {
    data,
    pending,
    error,
    refresh,
    isLinked,
    pendingCode,
    generating,
    generateLinkCode,
    unlinkTelegram,
  };
}
