import assert from "node:assert/strict";
import test from "node:test";
import {
  MAX_INVENTORY_QUANTITY,
  parseInitialInventoryQuantity,
} from "../src/features/seller/services/inventory-quantity.ts";

test("initial inventory accepts zero and the phase-one quantity", () => {
  assert.equal(parseInitialInventoryQuantity("0"), 0);
  assert.equal(parseInitialInventoryQuantity("10"), 10);
  assert.equal(parseInitialInventoryQuantity(String(MAX_INVENTORY_QUANTITY)), MAX_INVENTORY_QUANTITY);
});

test("initial inventory rejects missing, fractional, negative and overflowing quantities", () => {
  for (const value of ["", " ", "1.5", "-1", String(MAX_INVENTORY_QUANTITY + 1), "abc"]) {
    assert.throws(() => parseInitialInventoryQuantity(value));
  }
});
