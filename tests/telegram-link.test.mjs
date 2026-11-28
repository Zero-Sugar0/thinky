import assert from "node:assert/strict";
import { test } from "node:test";
import {
  isBareStartCommand,
  parseTelegramLinkCommand,
  telegramStartLink,
} from "../shared/telegram-link.ts";

test("accepts every way a person sends a link code", () => {
  assert.equal(parseTelegramLinkCommand("link 7C160C"), "7C160C");
  assert.equal(parseTelegramLinkCommand("/link 7c160c"), "7C160C");
  assert.equal(parseTelegramLinkCommand("/start link_7C160C"), "7C160C");
  assert.equal(parseTelegramLinkCommand("/start 7C160C"), "7C160C");
  assert.equal(parseTelegramLinkCommand("7C160C"), "7C160C");
  assert.equal(parseTelegramLinkCommand("  7C160C  "), "7C160C");
});

test("ignores ordinary messages", () => {
  assert.equal(parseTelegramLinkCommand("hello there"), undefined);
  assert.equal(parseTelegramLinkCommand("link 123"), undefined);
  assert.equal(parseTelegramLinkCommand("please link 7C160C now"), undefined);
  assert.equal(parseTelegramLinkCommand(undefined), undefined);
});

test("detects a bare /start but not a deep-link payload", () => {
  assert.equal(isBareStartCommand("/start"), true);
  assert.equal(isBareStartCommand("/start@ThinkyBot"), true);
  assert.equal(isBareStartCommand("/start link_7C160C"), false);
});

test("builds a deep link that carries the code", () => {
  assert.equal(telegramStartLink("ThinkyBot", "7C160C"), "https://t.me/ThinkyBot?start=link_7C160C");
  assert.equal(telegramStartLink("@ThinkyBot", "7C160C"), "https://t.me/ThinkyBot?start=link_7C160C");
});
