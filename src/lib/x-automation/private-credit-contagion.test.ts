import assert from "node:assert/strict";
import test from "node:test";
import {
  getNavDiscountSignal,
  getRedemptionPressureSignal,
} from "@/lib/contagion-watch";

test("redemption pressure is separated by the quarterly cap multiple", () => {
  assert.equal(getRedemptionPressureSignal(4, 5, 1, 2), "green");
  assert.equal(getRedemptionPressureSignal(6, 5, 1, 2), "yellow");
  assert.equal(getRedemptionPressureSignal(10, 5, 1, 2), "red");
});

test("listed BDC NAV discount thresholds are applied consistently", () => {
  assert.equal(getNavDiscountSignal(-5, -10, -20), "green");
  assert.equal(getNavDiscountSignal(-15, -10, -20), "yellow");
  assert.equal(getNavDiscountSignal(-25, -10, -20), "red");
});
