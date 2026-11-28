import assert from "node:assert/strict";
import { test } from "node:test";
import {
  chunkIMessageText,
  conversationAddress,
  IMESSAGE_MAX_CHARS,
  parseConversationAddress,
} from "../shared/imessage.ts";

test("a conversation address round-trips through the space and agent ids", () => {
  const address = conversationAddress("spc_1", "usr_9");
  assert.deepEqual(parseConversationAddress(address), { spaceId: "spc_1", agentId: "usr_9" });
});

test("addresses that are not iMessage conversations are rejected", () => {
  assert.equal(parseConversationAddress("slack:U123"), undefined);
  assert.equal(parseConversationAddress("imessage:only-space"), undefined);
});

test("short text is sent as one chunk", () => {
  assert.deepEqual(chunkIMessageText("hello"), ["hello"]);
});

test("long text splits under the limit and keeps every character", () => {
  const text = `${"a".repeat(1000)}\n${"b".repeat(1000)}`;
  const chunks = chunkIMessageText(text);
  assert.ok(chunks.length >= 2);
  for (const chunk of chunks) assert.ok(chunk.length <= IMESSAGE_MAX_CHARS);
  assert.equal(chunks.join("").replace(/\s/g, ""), text.replace(/\s/g, ""));
});
