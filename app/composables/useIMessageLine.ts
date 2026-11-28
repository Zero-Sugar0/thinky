export interface IMessageLineInfo {
  agentNumber: string | null;
  phoneNumber: string | null;
}

export function useIMessageLine() {
  const { data, pending, error, refresh } = useFetch<IMessageLineInfo>("/api/imessage/line", {
    server: false,
    ...payloadCacheOptions,
  });

  /** An sms: link opens Messages with the number and a message already filled in. */
  const openLink = computed(() => {
    const number = data.value?.agentNumber;
    if (!number) return undefined;
    return `sms:${number}&body=${encodeURIComponent("Hi Thinky!")}`;
  });

  return { data, pending, error, refresh, openLink };
}
