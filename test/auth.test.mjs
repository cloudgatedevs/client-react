import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";

import {
  createCloudgateAuth,
  decodeJwt,
  isTokenValid,
  IDP_ACCESS_TOKEN_KEY,
  IDP_REFRESH_TOKEN_KEY,
} from "../src/index.js";

// ---------- helpers ----------

function b64url(obj) {
  return Buffer.from(JSON.stringify(obj))
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function makeJwt(claims) {
  return `${b64url({ alg: "none" })}.${b64url(claims)}.sig`;
}

function futureJwt(extra = {}) {
  return makeJwt({
    sub: "user-1",
    email: "user@example.com",
    name: "Jane Doe",
    exp: Math.floor(Date.now() / 1000) + 3600,
    ...extra,
  });
}

function expiredJwt() {
  return makeJwt({ sub: "user-1", exp: Math.floor(Date.now() / 1000) - 60 });
}

function memStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
  };
}

function fakeWindow(href = "https://app.acme.example.com/dashboard?tab=1") {
  const u = new URL(href);
  const win = {
    location: {
      get href() {
        return u.toString();
      },
      set href(v) {
        win.__redirectedTo = v;
      },
      hostname: u.hostname,
      pathname: u.pathname,
      search: u.search,
      hash: u.hash,
    },
    history: {
      replaceState(_s, _t, newUrl) {
        win.__cleanedUrl = newUrl;
      },
    },
    __redirectedTo: null,
    __cleanedUrl: null,
  };
  return win;
}

let savedWindow;
beforeEach(() => {
  savedWindow = globalThis.window;
});
afterEach(() => {
  globalThis.window = savedWindow;
});

const IDP = "https://idp.example.com";

// ---------- jwt utils ----------

test("decodeJwt / isTokenValid", () => {
  const t = futureJwt();
  assert.equal(decodeJwt(t).sub, "user-1");
  assert.equal(isTokenValid(t), true);
  assert.equal(isTokenValid(expiredJwt()), false);
  assert.equal(isTokenValid("garbage"), false);
  assert.equal(decodeJwt("garbage"), null);
});

// ---------- init: consume redirect tokens ----------

test("init consumes ?access_token from the IdP redirect and cleans the URL", async () => {
  const token = futureJwt();
  globalThis.window = fakeWindow(
    `https://app.acme.example.com/dash?access_token=${token}&refresh_token=r1&expires_in=3600&tab=2`
  );
  const storage = memStorage();
  const auth = createCloudgateAuth({
    idpBaseUrl: IDP,
    tenancyName: "acme",
    storage,
  });

  const session = await auth.init();
  assert.ok(session, "session restored from URL tokens");
  assert.equal(session.accessToken, token);
  assert.equal(storage.getItem(IDP_ACCESS_TOKEN_KEY), token);
  assert.equal(storage.getItem(IDP_REFRESH_TOKEN_KEY), "r1");
  assert.equal(session.user.email, "user@example.com");
  // URL cleaned, other params kept
  assert.ok(globalThis.window.__cleanedUrl.includes("tab=2"));
  assert.ok(!globalThis.window.__cleanedUrl.includes("access_token"));
});

// ---------- init: restore stored ----------

test("init restores a valid stored session without redirecting", async () => {
  globalThis.window = fakeWindow();
  const storage = memStorage();
  storage.setItem(IDP_ACCESS_TOKEN_KEY, futureJwt());
  const auth = createCloudgateAuth({
    idpBaseUrl: IDP,
    tenancyName: "acme",
    requireLogin: true,
    storage,
  });

  const session = await auth.init();
  assert.ok(session);
  assert.equal(globalThis.window.__redirectedTo, null);
  assert.equal(auth.isAuthenticated(), true);
  assert.deepEqual(auth.authHeader(), {
    Authorization: `Bearer ${session.accessToken}`,
  });
});

// ---------- init: REQUIRE_LOGIN redirect ----------

test("init redirects to hosted login with CURRENT url as returnUrl when requireLogin", async () => {
  const here = "https://app.acme.example.com/reports?x=1";
  globalThis.window = fakeWindow(here);
  const auth = createCloudgateAuth({
    idpBaseUrl: IDP,
    tenancyName: "acme",
    requireLogin: "true", // string form, as it comes from env vars
    storage: memStorage(),
  });

  const session = await auth.init();
  assert.equal(session, null);
  const dest = globalThis.window.__redirectedTo;
  assert.ok(dest.startsWith(`${IDP}/idp/acme/login?returnUrl=`));
  assert.equal(new URL(dest).searchParams.get("returnUrl"), here);
});

test("init does NOT redirect when requireLogin is off", async () => {
  globalThis.window = fakeWindow();
  const auth = createCloudgateAuth({
    idpBaseUrl: IDP,
    tenancyName: "acme",
    storage: memStorage(),
  });
  const session = await auth.init();
  assert.equal(session, null);
  assert.equal(globalThis.window.__redirectedTo, null);
});

// ---------- tenancy resolution ----------

test("tenancy resolves from query param, then explicit, then subdomain", () => {
  globalThis.window = fakeWindow("https://acme.example.com/?idp_tenant=override");
  const a = createCloudgateAuth({ idpBaseUrl: IDP, tenancyName: "cfg", storage: memStorage() });
  assert.equal(a.tenancyName, "override");

  globalThis.window = fakeWindow("https://acme.example.com/");
  const b = createCloudgateAuth({ idpBaseUrl: IDP, tenancyName: "cfg", storage: memStorage() });
  assert.equal(b.tenancyName, "cfg");

  const c = createCloudgateAuth({ idpBaseUrl: IDP, storage: memStorage() });
  assert.equal(c.tenancyName, "acme");
});

// ---------- refresh ----------

test("init refreshes an expired token via the Refresh endpoint", async () => {
  const newToken = futureJwt({ email: "fresh@example.com" });
  let refreshHits = 0;
  const server = http.createServer((req, res) => {
    refreshHits++;
    assert.equal(req.url, "/api/idp/acme/Refresh");
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({ result: { accessToken: newToken, refreshToken: "r2", expiresIn: 3600 } })
    );
  });
  await new Promise((r) => server.listen(0, r));
  const apiUrl = `http://127.0.0.1:${server.address().port}`;

  globalThis.window = fakeWindow();
  const storage = memStorage();
  storage.setItem(IDP_ACCESS_TOKEN_KEY, expiredJwt());
  storage.setItem(IDP_REFRESH_TOKEN_KEY, "r1");

  const auth = createCloudgateAuth({
    idpBaseUrl: IDP,
    idpApiUrl: apiUrl,
    tenancyName: "acme",
    requireLogin: true,
    storage,
  });

  const session = await auth.init();
  server.close();
  assert.equal(refreshHits, 1);
  assert.ok(session, "session restored via refresh");
  assert.equal(session.accessToken, newToken);
  assert.equal(storage.getItem(IDP_REFRESH_TOKEN_KEY), "r2");
  assert.equal(globalThis.window.__redirectedTo, null);
});

// ---------- logout ----------

test("logout clears the session and redirects to login", () => {
  globalThis.window = fakeWindow();
  const storage = memStorage();
  storage.setItem(IDP_ACCESS_TOKEN_KEY, futureJwt());
  const auth = createCloudgateAuth({ idpBaseUrl: IDP, tenancyName: "acme", storage });

  assert.equal(auth.isAuthenticated(), true);
  auth.logout();
  assert.equal(auth.isAuthenticated(), false);
  assert.equal(storage.getItem(IDP_ACCESS_TOKEN_KEY), null);
  assert.ok(globalThis.window.__redirectedTo.includes("/idp/acme/login"));
});

// ---------- client integration: headers as a function ----------

test("client headers-as-function attaches the current auth header per request", async () => {
  const { createCloudgateClient } = await import("../src/index.js");
  globalThis.window = fakeWindow();
  const storage = memStorage();
  const auth = createCloudgateAuth({ idpBaseUrl: IDP, tenancyName: "acme", storage });

  let seenAuth;
  const server = http.createServer((req, res) => {
    seenAuth = req.headers.authorization ?? null;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ ok: true }));
  });
  await new Promise((r) => server.listen(0, r));
  const client = createCloudgateClient({
    baseUrl: `http://127.0.0.1:${server.address().port}/api`,
    headers: () => auth.authHeader(),
  });

  await client.get("/x"); // unauthenticated -> no header
  assert.equal(seenAuth, null);

  const token = futureJwt();
  storage.setItem(IDP_ACCESS_TOKEN_KEY, token);
  await client.get("/x"); // now authenticated -> bearer attached
  assert.equal(seenAuth, `Bearer ${token}`);
  server.close();
});
