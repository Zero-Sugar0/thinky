import { callSlackApi } from "eve/channels/slack";
import type { DeliveryChannel } from "#shared/types/delivery";
import type { DeliveryPlanEntry } from "#shared/delivery-plan";
import { isPhotonBetaEnabled, sendIMessageText } from "#shared/imessage";

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

/** Sends through the Photon 2.0 Beta project to the saved conversation address. */
export async function sendIMessage(address: string, text: string, idempotencyKey: string): Promise<SendResult> {
  if (!isPhotonBetaEnabled()) {
    return { ok: false, reason: "iMessage is not configured" };
  }
  try {
    await sendIMessageText(address, text, idempotencyKey);
    return { ok: true };
  }
  catch (error) {
    return { ok: false, reason: `iMessage: ${error instanceof Error ? error.message : "send failed"}` };
  }
}

/**
 * Sends one message to every planned channel. Returns the channels that accepted it.
 * The idempotency key identifies the message (for example, the reminder or notification id), so a
 * retried job does not send it twice on channels that support idempotency keys.
 * Web chat is recorded when the notification is completed, so it is reported as delivered here.
 */
export async function deliverToPlan(plan: DeliveryPlanEntry[], text: string, idempotencyKey: string): Promise<DeliveryChannel[]> {
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
      else if (entry.channel === "imessage" && entry.target) {
        result = await sendIMessage(entry.target, text, `${idempotencyKey}:imessage`);
      }
      else {
        result = { ok: false, reason: `${entry.channel} has no address` };
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
