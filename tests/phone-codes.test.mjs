import assert from "node:assert/strict";
import { test } from "node:test";
import { formatPhoneNumber, parsePhoneNumber } from "../shared/phone-codes.ts";

test("Ghana numbers drop the leading 0 when formatted", () => {
  assert.equal(formatPhoneNumber("GH", "024 412 3456"), "+233244123456");
  assert.equal(formatPhoneNumber("GH", "244123456"), "+233244123456");
});

test("a +233 number is shown with Ghana selected", () => {
  assert.deepEqual(parsePhoneNumber("+233244123456", "US"), { countryCode: "GH", local: "244123456" });
});

test("France keeps its trunk 0 stripped, as before", () => {
  assert.equal(formatPhoneNumber("FR", "06 12 34 56 78"), "+33612345678");
});
