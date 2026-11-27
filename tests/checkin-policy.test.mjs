import assert from "node:assert/strict";
import { test } from "node:test";
import {
  BASE_SEND_CHANCE,
  DAILY_CHECKIN_CAP,
  decideCheckin,
  isQuietHour,
} from "../server/utils/checkin-policy.ts";

const day = (overrides = {}) => ({
  localHour: 10,
  openTasks: 0,
  overdueTasks: 0,
  dueSoonTasks: 0,
  staleTasks: 0,
  recentActivity: 0,
  hasMemories: false,
  recentCheckins: [],
  ...overrides,
});

const gateOpen = { gate: 0, pick: 0 };
const gateClosed = { gate: 0.999, pick: 0 };

test("quiet hours are 22:00 to 08:00 and nothing is sent in them", () => {
  assert.equal(isQuietHour(22), true);
  assert.equal(isQuietHour(3), true);
  assert.equal(isQuietHour(8), false);
  assert.equal(isQuietHour(14), false);
  assert.equal(decideCheckin(day({ localHour: 23, overdueTasks: 1 }), gateOpen), null);
});

test("the daily cap stops everything, urgent items included", () => {
  const recentCheckins = Array.from({ length: DAILY_CHECKIN_CAP }, () => ({ category: "conversation", hoursAgo: 2 }));
  assert.equal(decideCheckin(day({ overdueTasks: 1, recentCheckins }), gateOpen), null);
});

test("overdue or due-soon work is always surfaced as important, even with the gate closed", () => {
  assert.equal(decideCheckin(day({ overdueTasks: 1 }), gateClosed), "important");
  assert.equal(decideCheckin(day({ dueSoonTasks: 1 }), gateClosed), "important");
});

test("important is not repeated within the cooldown", () => {
  const recentCheckins = [{ category: "important", hoursAgo: 1 }];
  const result = decideCheckin(day({ overdueTasks: 1, recentCheckins }), gateClosed);
  assert.notEqual(result, "important");
});

test("routine check-ins respect the random gate", () => {
  assert.equal(decideCheckin(day({ openTasks: 2 }), { gate: BASE_SEND_CHANCE, pick: 0 }), null);
  assert.notEqual(decideCheckin(day({ openTasks: 2 }), { gate: BASE_SEND_CHANCE - 0.01, pick: 0 }), null);
});

test("a stale task is preferred for undone_task when the pick lands in its weight", () => {
  const result = decideCheckin(day({ openTasks: 3, staleTasks: 2 }), { gate: 0, pick: 0 });
  assert.equal(result, "undone_task");
});

test("picks are weighted: the pick roll selects across eligible categories", () => {
  const signals = day({ openTasks: 1, recentActivity: 1, hasMemories: true });
  // Eligible: undone_task(2), follow_up(2), update(2), conversation(2): total 8.
  assert.equal(decideCheckin(signals, { gate: 0, pick: 0.0 }), "undone_task");
  assert.equal(decideCheckin(signals, { gate: 0, pick: 0.3 }), "follow_up");
  assert.equal(decideCheckin(signals, { gate: 0, pick: 0.6 }), "update");
  assert.equal(decideCheckin(signals, { gate: 0, pick: 0.9 }), "conversation");
});

test("a category sent recently is excluded from routine picks", () => {
  const signals = day({
    openTasks: 1,
    recentCheckins: [{ category: "undone_task", hoursAgo: 2 }],
  });
  // undone_task is excluded, so the first remaining eligible category (update) wins at pick 0.
  assert.equal(decideCheckin(signals, { gate: 0, pick: 0 }), "update");
});

test("with nothing to talk about, the conversation category is the fallback", () => {
  assert.equal(decideCheckin(day(), { gate: 0, pick: 0.5 }), "conversation");
});
