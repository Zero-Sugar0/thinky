import { verifyQStashOrSecret } from "~~/server/utils/qstash";
import {
  claimDueReminders,
  claimNotifications,
  completeNotification,
  completeReminder,
  releaseNotification,
  releaseReminder,
  listDeliveryTargets,
} from "~~/server/utils/notifications";
import { deliverToPlan } from "~~/server/utils/delivery";
import { formatReminder, planDelivery } from "#shared/delivery-plan";

const BATCH = 20;
const LEASE_SECONDS = 300;

/**
 * Runs on a QStash schedule (every minute). Sends due reminders and drains the outbox of
 * proactive check-ins. Each row is leased while it is delivered, so overlapping runs never
 * send the same message twice.
 */
export default defineEventHandler(async (event) => {
  if (!(await verifyQStashOrSecret(event))) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized QStash or cron request" });
  }

  let remindersSent = 0;
  const reminders = await claimDueReminders(BATCH, LEASE_SECONDS);
  for (const reminder of reminders) {
    const text = formatReminder(reminder.title, reminder.notes, reminder.dueAt);
    try {
      const targets = await listDeliveryTargets(reminder.userId);
      const { attempt } = planDelivery(["chat", "slack", "imessage", "telegram"], targets);
      const delivered = await deliverToPlan(attempt, text, `reminder:${reminder.id}`);
      await completeReminder(reminder.id, reminder.userId, delivered, text);
      remindersSent++;
    }
    catch {
      await releaseReminder(reminder.id, reminder.userId).catch(() => undefined);
    }
  }

  let notificationsSent = 0;
  const notifications = await claimNotifications(BATCH, LEASE_SECONDS);
  for (const notification of notifications) {
    try {
      const targets = await listDeliveryTargets(notification.userId);
      const { attempt } = planDelivery(notification.channels, targets);
      const delivered = await deliverToPlan(attempt, notification.content, `notification:${notification.id}`);

      if (delivered.length === 0 && attempt.length > 0) {
        await releaseNotification(notification.id, "no channel accepted the message");
      }
      else {
        await completeNotification(notification.id, delivered);
        notificationsSent++;
      }
    }
    catch (error) {
      await releaseNotification(notification.id, error instanceof Error ? error.message : "unknown error").catch(() => undefined);
    }
  }

  return { ok: true, reminders: remindersSent, notifications: notificationsSent };
});
