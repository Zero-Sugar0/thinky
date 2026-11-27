import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
import { getInstructionSection, listInstructionSections } from "../agent/identity/sections.ts";

const instructions = fs.readFileSync(new URL("../agent/identity/INSTRUCTIONS.md", import.meta.url), "utf8");
const soul = fs.readFileSync(new URL("../agent/identity/SOUL.md", import.meta.url), "utf8");

test("lists every playbook section in INSTRUCTIONS.md", () => {
  const names = listInstructionSections(instructions);
  assert.ok(names.includes("tasks"));
  assert.ok(names.includes("standing-rules"));
  assert.ok(names.includes("actions"));
});

test("returns one section body without bleeding into the next section", () => {
  const tasks = getInstructionSection(instructions, "tasks");
  assert.ok(tasks);
  assert.match(tasks, /^## tasks/);
  assert.ok(!tasks.includes("## standing-rules"));
});

test("returns null for an unknown section", () => {
  assert.equal(getInstructionSection(instructions, "does-not-exist"), null);
});

test("every playbook section the core instructions point to exists", () => {
  const core = ["tasks", "actions", "meetings", "growth", "composio", "browser", "zomato", "skills"];
  const names = listInstructionSections(instructions);
  for (const name of core) {
    assert.ok(names.includes(name), `missing playbook section: ${name}`);
  }
});

test("SOUL.md defines identity and boundaries", () => {
  assert.match(soul, /## Character/);
  assert.match(soul, /## Boundaries/);
  assert.match(soul, /\{\{agent\.name\}\}/);
});
