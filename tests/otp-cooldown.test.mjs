import assert from "node:assert/strict";
import test from "node:test";
import {
  getStoredCooldownSeconds,
  saveStoredCooldown,
  clearStoredCooldown,
} from "../src/features/auth/hooks/useOtpCooldown.ts";

function mockBrowserStorage() {
  const map = new Map();
  const mockStorage = {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, val) => map.set(key, String(val)),
    removeItem: (key) => map.delete(key),
    clear: () => map.clear(),
  };
  globalThis.window = {
    localStorage: mockStorage,
  };
  return mockStorage;
}

test("OTP cooldown persists in localStorage and calculates remaining time across page reloads", () => {
  mockBrowserStorage();
  const testEmail = "buyer@example.com";

  // Initially no cooldown
  assert.equal(getStoredCooldownSeconds(testEmail), 0);

  // Start a 60-second cooldown
  saveStoredCooldown(testEmail, 60);

  // Simulating reload right after save: remaining should be 59-60s
  const remaining = getStoredCooldownSeconds(testEmail);
  assert.ok(remaining >= 59 && remaining <= 60, `Expected ~60s, got ${remaining}`);

  // Simulating expired cooldown
  const storageKey = `nexus_otp_cooldown_${testEmail.replace(/[^a-z0-9]/gi, "_")}`;
  globalThis.window.localStorage.setItem(storageKey, String(Date.now() - 5000));

  assert.equal(getStoredCooldownSeconds(testEmail), 0);
  assert.equal(globalThis.window.localStorage.getItem(storageKey), null);

  // Manual clear
  saveStoredCooldown(testEmail, 30);
  clearStoredCooldown(testEmail);
  assert.equal(getStoredCooldownSeconds(testEmail), 0);
});
