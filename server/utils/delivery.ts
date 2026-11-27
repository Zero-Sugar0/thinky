import { callSlackApi } from "eve/channels/slack";
import type { DeliveryChannel } from "#shared/types/delivery";
import type { DeliveryPlanEntry } from "#shared/delivery-plan";

export interface SendResult {
  ok: boolean;
  reason?: string;
}

export async function sendSlackDm(slackUserId: string, text: string): Promise<SendResult> {
  const response = await callSlackApi({
    botToken: undefined, // uses SLACK_BOT_TOKEN by default
    operation: "chat.postMessage",
    body: { channel: slackUserId, text },
  }) as { ok?: boolean; error?: string } | undefined;

  return response?.ok ? { ok: true } : { ok: false, reason: `Slack: ${response?.error ?? "no response"}` };
}

export async function sendTelegramMessage(chatId: string, text: string): Promise<SendResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return { ok: false, reason: "Telegram is not configured" };
  }

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
  return response.ok ? { ok: true } : { ok: false, reason: `Telegram returned ${response.status}` };
}

/**
 * iMessage can only be sent through an Eve channel handoff, which needs the agent runtime.
 * This dispatcher runs as a QStash route outside it, so iMessage is reported as not yet sent.
 */
export function sendIMessage(): SendResult {
  return { ok: false, reason: "iMessage delivery needs an Eve channel handoff, which the QStash dispatcher cannot start yet" };
}

/**
 * Sends one message to every planned channel. Returns the channels that accepted it.
 * Web chat is recorded when the notification is completed, so it is reported as delivered here.
 */
export async function deliverToPlan(plan: DeliveryPlanEntry[], text: string): Promise<DeliveryChannel[]> {
  const delivered: DeliveryChannel[] = [];

  for (const entry of plan) {
    let result: SendResult;
    try {
      if (entry.channel === "chat") {
        result = { ok: true };
      }
      else if (entry.channel === "slack" && entry.target) {
        result = await sendSlackDm(entry.target, text);
      }
      else if (entry.channel === "telegram" && entry.target) {
        result = await sendTelegramMessage(entry.target, text);
      }
      else {
        result = sendIMessage();
      }
    }
    catch (error) {
      result = { ok: false, reason: error instanceof Error ? error.message : "unknown error" };
    }

    if (result.ok) {
      delivered.push(entry.channel);
    }
    else {
      console.warn("[delivery] channel skipped", { channel: entry.channel, reason: result.reason });
    }
  }

  return delivered;
}
