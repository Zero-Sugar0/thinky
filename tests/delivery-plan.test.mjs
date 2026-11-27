import assert from "node:assert/strict";
import { test } from "node:test";
import { formatReminder, planDelivery } from "../shared/delivery-plan.ts";
import { expandChannelPreference } from "../shared/types/delivery.ts";

test("web chat is always attempted and needs no address", () => {
  const { attempt } = planDelivery(["chat"], {});
  assert.deepEqual(attempt, [{ channel: "chat", target: null }]);
});

test("external channels are only attempted when an address exists", () => {
  const { attempt, skipped } = planDelivery(["chat", "slack", "telegram"], { slack: "U123" });
  assert.deepEqual(attempt.map(a => a.channel), ["chat", "slack"]);
  assert.equal(attempt[1].target, "U123");
  assert.deepEqual(skipped, ["telegram"]);
});

test("'all' expands to every delivery channel and a single channel stays single", () => {
  assert.deepEqual(expandChannelPreference("all"), ["chat", "slack", "imessage", "telegram"]);
  assert.deepEqual(expandChannelPreference("slack"), ["slack"]);
  assert.deepEqual(expandChannelPreference("nonsense"), ["chat"]);
});

test("reminders include the due time and notes when present", () => {
  assert.equal(formatReminder("Send the invoice", "", null), "Reminder: Send the invoice");
  assert.equal(
    formatReminder("Call Ama", "About the contract", "2026-12-01T09:00:00.000Z"),
    "Reminder: Call Ama\nDue: 2026-12-01T09:00:00.000Z\nAbout the contract",
  );
});
