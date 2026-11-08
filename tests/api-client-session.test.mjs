import assert from "node:assert/strict";
import test from "node:test";
import { api, clearSessionTokens, extractRolesFromToken, getStoredRoles, saveSessionTokens, SESSION_INVALIDATED_EVENT } from "../src/lib/api/client.ts";

function browserSession() {
  const values = new Map();
  const browser = new EventTarget();
  browser.localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
  globalThis.window = browser;
  return browser;
}

function json(value, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json" } });
}

test("active account is checked before an authenticated request", async () => {
  browserSession();
  saveSessionTokens("active-access", "active-refresh");
  const paths = [];
  globalThis.fetch = async (url) => {
    paths.push(url);
    return json(url.endsWith("/me") ? { id: "buyer", status: "Active" } : { id: "order" });
  };

  const order = await api.get("/api/v1/orders/123");
  assert.equal(order.id, "order");
  assert.deepEqual(paths, ["/api/gateway/api/v1/me", "/api/gateway/api/v1/orders/123"]);
});

test("banned account is signed out before its next request", async () => {
  const browser = browserSession();
  saveSessionTokens("banned-access", "banned-refresh");
  let invalidations = 0;
  let orderCalls = 0;
  browser.addEventListener(SESSION_INVALIDATED_EVENT, () => { invalidations += 1; });
  globalThis.fetch = async (url) => {
    if (url.endsWith("/me")) return json({ id: "buyer", status: "Banned" });
    orderCalls += 1;
    return json({ id: "order" });
  };

  await assert.rejects(api.get("/api/v1/orders/123"), { status: 403, errorCode: "ACCOUNT_BANNED" });
  assert.equal(orderCalls, 0);
  assert.equal(invalidations, 1);
  assert.equal(browser.localStorage.getItem("nexus_access_token"), null);
  assert.equal(browser.localStorage.getItem("nexus_refresh_token"), null);
});

test("old account check cannot invalidate or authorize a new session", async () => {
  const browser = browserSession();
  saveSessionTokens("old-access", "old-refresh");
  let releaseOldProfile;
  let oldProfileStarted;
  const started = new Promise((resolve) => { oldProfileStarted = resolve; });
  const oldProfile = new Promise((resolve) => { releaseOldProfile = resolve; });
  const profileTokens = [];
  let targetToken = null;
  globalThis.fetch = async (url, options) => {
    const token = options.headers.get("Authorization");
    if (url.endsWith("/me")) {
      profileTokens.push(token);
      if (token === "Bearer old-access") {
        oldProfileStarted();
        return oldProfile;
      }
      return json({ id: "new-buyer", status: "Active" });
    }
    targetToken = token;
    return json({ id: "new-order" });
  };

  const pending = api.get("/api/v1/orders/123");
  await started;
  saveSessionTokens("new-access", "new-refresh");
  releaseOldProfile(json({ id: "old-buyer", status: "Banned" }));
  await pending;

  assert.deepEqual(profileTokens, ["Bearer old-access", "Bearer new-access"]);
  assert.equal(targetToken, "Bearer new-access");
  assert.equal(browser.localStorage.getItem("nexus_access_token"), "new-access");
});

test("public login request does not require an existing session check", async () => {
  browserSession();
  const paths = [];
  globalThis.fetch = async (url) => { paths.push(url); return json({ accessToken: "new-access" }); };

  await api.post("/api/v1/auth/login", { identifier: "buyer", password: "example" });
  assert.deepEqual(paths, ["/api/gateway/api/v1/auth/login"]);
});

test("browser role edits cannot grant UI access", () => {
  const browser = browserSession();
  browser.localStorage.setItem("nexus_session_roles", JSON.stringify(["ADMIN"]));
  saveSessionTokens("access-token", "refresh-token", ["ADMIN", "SELLER"]);
  assert.equal(browser.localStorage.getItem("nexus_session_roles"), null);
  browser.localStorage.setItem("nexus_session_roles", JSON.stringify(["ADMIN"]));
  assert.deepEqual(getStoredRoles(), []);

  clearSessionTokens();
  assert.equal(browser.localStorage.getItem("nexus_session_roles"), null);
  assert.deepEqual(getStoredRoles(), []);
});

test("roles can be extracted from unpadded JWT token claims", () => {
  const payload = {
    sub: "user-123",
    "http://schemas.microsoft.com/ws/2008/06/identity/claims/role": "Admin",
  };
  const base64Url = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const token = `header.${base64Url}.signature`;

  assert.deepEqual(extractRolesFromToken(token), ["Admin"]);
});

test("consecutive authenticated requests reuse the 30s /api/v1/me verification cache until session rotates", async () => {
  browserSession();
  saveSessionTokens("cached-access", "cached-refresh");
  const paths = [];
  globalThis.fetch = async (url) => {
    paths.push(url);
    return json(url.endsWith("/me") ? { id: "admin", status: "Active" } : { ok: true });
  };

  await api.get("/api/v1/admin/users");
  await api.get("/api/v1/admin/configs");
  assert.deepEqual(paths, [
    "/api/gateway/api/v1/me",
    "/api/gateway/api/v1/admin/users",
    "/api/gateway/api/v1/admin/configs",
  ]);

  saveSessionTokens("rotated-access", "rotated-refresh");
  await api.get("/api/v1/admin/roles");
  assert.deepEqual(paths, [
    "/api/gateway/api/v1/me",
    "/api/gateway/api/v1/admin/users",
    "/api/gateway/api/v1/admin/configs",
    "/api/gateway/api/v1/me",
    "/api/gateway/api/v1/admin/roles",
  ]);
});

test("direct /api/v1/me call from SessionProvider warms the 30s TTL cache and deduplicates concurrent checks", async () => {
  browserSession();
  saveSessionTokens("session-access", "session-refresh");
  const paths = [];
  globalThis.fetch = async (url) => {
    paths.push(url);
    return json(url.endsWith("/me") ? { id: "admin", status: "Active" } : { ok: true });
  };

  await Promise.all([api.get("/api/v1/me"), api.get("/api/v1/admin/users")]);
  await api.get("/api/v1/admin/configs");

  assert.deepEqual(paths, [
    "/api/gateway/api/v1/me",
    "/api/gateway/api/v1/admin/users",
    "/api/gateway/api/v1/admin/configs",
  ]);
});

test("token refresh overwrites tampered nexus_session_roles in localStorage with new JWT claims", async () => {
  const browser = browserSession();
  saveSessionTokens("expired-access", "valid-refresh", ["Buyer"]);
  browser.localStorage.setItem("nexus_session_roles", JSON.stringify(["Admin"]));

  const buyerPayload = Buffer.from(JSON.stringify({ sub: "u1", roles: ["Buyer"] })).toString("base64url");
  const newAccessJwt = `header.${buyerPayload}.sig`;

  let orderAttempt = 0;
  globalThis.fetch = async (url) => {
    if (url.endsWith("/me")) return json({ id: "u1", status: "Active" });
    if (url.endsWith("/auth/refresh")) {
      return json({ accessToken: newAccessJwt, refreshToken: "rotated-refresh" });
    }
    orderAttempt += 1;
    if (orderAttempt === 1) return json({ title: "Expired" }, 401);
    return json({ id: "order-ok" });
  };

  const result = await api.get("/api/v1/orders/1");
  assert.equal(result.id, "order-ok");
  assert.deepEqual(getStoredRoles(), ["Buyer"]);
  assert.equal(browser.localStorage.getItem("nexus_session_roles"), JSON.stringify(["Buyer"]));
});


