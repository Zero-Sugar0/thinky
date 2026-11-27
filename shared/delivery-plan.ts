import type { DeliveryChannel } from "./types/delivery";

export interface DeliveryPlanEntry {
  channel: DeliveryChannel;
  /** Address on that channel: a Slack user id, a Telegram chat id, or an iMessage thread id. Null for web chat, which needs none. */
  target: string | null;
}

/**
 * Decides, per requested channel, how to reach the user.
 * Web chat is always available and needs no address. Other channels are attempted
 * only when the user has a stored address for them.
 */
export function planDelivery(
  requested: readonly DeliveryChannel[],
  targets: Partial<Record<DeliveryChannel, string>>,
): { attempt: DeliveryPlanEntry[]; skipped: DeliveryChannel[] } {
  const attempt: DeliveryPlanEntry[] = [];
  const skipped: DeliveryChannel[] = [];

  for (const channel of requested) {
    if (channel === "chat") {
      attempt.push({ channel, target: null });
      continue;
    }
    const target = targets[channel];
    if (target) {
      attempt.push({ channel, target });
    }
    else {
      skipped.push(channel);
    }
  }

  return { attempt, skipped };
}

export function formatReminder(title: string, notes: string, dueAt: string | null): string {
  const lines = [`Reminder: ${title}`];
  if (dueAt) lines.push(`Due: ${dueAt}`);
  if (notes.trim()) lines.push(notes.trim());
  return lines.join("\n");
}
