import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import crypto from "node:crypto";

import { createCloudgateClient, CloudgateError } from "../src/index.js";

const API_KEY = "test-key";
const API_SECRET = "test-secret";

let server;
let baseUrl;
let lastRequest;

function verifySignature(req, body) {
  const ts = req.headers["x-timestamp"];
  const sig = req.headers["x-authentication-signature"];
  if (!ts || !sig) return false;
  const payload = `${ts}${req.method}${req.url}${body}`;
  const expected = crypto
    .createHmac("sha512", API_SECRET)
    .update(payload)
    .digest("hex");
  return sig === expected;
}

before(async () => {
  server = http.createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      lastRequest = {
        method: req.method,
        url: req.url,
        headers: req.headers,
        body,
        sigValid: verifySignature(req, body),
        signed: Boolean(req.headers["x-api-key"]),
      };
      res.setHeader("Content-Type", "application/json");

      if (req.url.startsWith("/api/fail")) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: "boom" }));
      } else if (req.url.startsWith("/api/double-encoded")) {
        // JSON string containing JSON — the client must coerce it
        res.end(JSON.stringify(JSON.stringify({ result: { deep: true } })));
      } else if (req.url.startsWith("/api/wrapped")) {
        res.end(JSON.stringify({ result: { items: [1, 2, 3] } }));
      } else if (req.url.startsWith("/api/slow")) {
        setTimeout(() => res.end(JSON.stringify({ ok: true })), 2000);
      } else {
        res.end(JSON.stringify({ ok: true, echo: body || null }));
      }
    });
  });
  await new Promise((r) => server.listen(0, r));
  baseUrl = `http://127.0.0.1:${server.address().port}/api`;
});

after(() => server.close());

function makeClient(extra = {}) {
  return createCloudgateClient({
    baseUrl,
    apiKey: API_KEY,
    apiSecret: API_SECRET,
    ...extra,
  });
}

test("GET signs the path including query params", async () => {
  const client = makeClient();
  const res = await client.get("/things", { params: { skip: 0, take: 25, q: "hi" } });
  assert.equal(res.ok, true);
  assert.equal(lastRequest.url, "/api/things?skip=0&take=25&q=hi");
  assert.equal(lastRequest.sigValid, true, "HMAC signature must verify server-side");
});

test("POST signs the JSON body and sends Content-Type", async () => {
  const client = makeClient();
  const res = await client.post("/contact", { name: "Jane", msg: "hello" });
  assert.equal(res.ok, true);
  assert.equal(lastRequest.method, "POST");
  assert.equal(lastRequest.headers["content-type"], "application/json");
  assert.deepEqual(JSON.parse(lastRequest.body), { name: "Jane", msg: "hello" });
  assert.equal(lastRequest.sigValid, true);
});

test("unwraps single-key { result } envelopes", async () => {
  const client = makeClient();
  const res = await client.get("/wrapped");
  assert.deepEqual(res, { items: [1, 2, 3] });
});

test("raw: true skips envelope unwrapping", async () => {
  const client = makeClient();
  const res = await client.get("/wrapped", { raw: true });
  assert.deepEqual(res, { result: { items: [1, 2, 3] } });
});

test("coerces double-encoded JSON strings", async () => {
  const client = makeClient();
  const res = await client.get("/double-encoded");
  assert.deepEqual(res, { deep: true });
});

test("non-2xx throws CloudgateError with status and body", async () => {
  const client = makeClient();
  await assert.rejects(
    () => client.get("/fail"),
    (err) => {
      assert.ok(err instanceof CloudgateError);
      assert.equal(err.status, 500);
      assert.deepEqual(err.body, { error: "boom" });
      return true;
    }
  );
});

test("sends unsigned when key/secret are omitted", async () => {
  const client = createCloudgateClient({ baseUrl });
  assert.equal(client.signingEnabled, false);
  const res = await client.get("/things");
  assert.equal(res.ok, true);
  assert.equal(lastRequest.signed, false);
});

test("times out and throws CloudgateError", async () => {
  const client = makeClient();
  await assert.rejects(
    () => client.get("/slow", { timeoutMs: 200 }),
    (err) => {
      assert.ok(err instanceof CloudgateError);
      assert.match(err.message, /timed out/i);
      return true;
    }
  );
});

test("throws when baseUrl is missing", () => {
  assert.throws(() => createCloudgateClient({}), CloudgateError);
});

test("environment segment is inserted between origin and path", async () => {
  const origin = baseUrl.replace(/\/api$/, ""); // http://127.0.0.1:port
  const client = createCloudgateClient({
    baseUrl: origin,
    environment: "api", // stands in for prd/sbx against the mock
    apiKey: API_KEY,
    apiSecret: API_SECRET,
  });
  assert.equal(client.baseUrl, `${origin}/api`);
  assert.equal(client.environment, "api");
  const res = await client.get("/things", { params: { a: 1 } });
  assert.equal(res.ok, true);
  assert.equal(lastRequest.url, "/api/things?a=1");
  assert.equal(lastRequest.sigValid, true, "signature covers the environment segment");
});

test("environment accepts stray slashes and can be omitted", async () => {
  const origin = baseUrl.replace(/\/api$/, "");
  const slashy = createCloudgateClient({ baseUrl: origin + "/", environment: "/api/" });
  assert.equal(slashy.baseUrl, `${origin}/api`);
  const none = createCloudgateClient({ baseUrl });
  assert.equal(none.baseUrl, baseUrl);
  assert.equal(none.environment, "");
});

test("basePath is appended after environment and signed", async () => {
  const origin = baseUrl.replace(/\/api$/, ""); // http://127.0.0.1:port
  const client = createCloudgateClient({
    baseUrl: origin,
    environment: "prod",
    basePath: "api", // controller path configured once at construction
    apiKey: API_KEY,
    apiSecret: API_SECRET,
  });
  assert.equal(client.baseUrl, `${origin}/prod/api`);
  assert.equal(client.basePath, "api");
  const res = await client.post("/contact", { hi: 1 });
  assert.equal(res.ok, true);
  // route resolves to origin/{env}/{basePath}/{route} and the signature
  // covers the full path
  assert.equal(lastRequest.url, "/prod/api/contact");
  assert.equal(lastRequest.sigValid, true);
});

test("basePath works without an environment", () => {
  const origin = baseUrl.replace(/\/api$/, "");
  const c = createCloudgateClient({ baseUrl: origin, basePath: "/api/" });
  assert.equal(c.baseUrl, `${origin}/api`);
  assert.equal(c.environment, "");
  assert.equal(c.basePath, "api");
});

test("PUT / PATCH / DELETE are signed too", async () => {
  const client = makeClient();
  await client.put("/things/1", { a: 1 });
  assert.equal(lastRequest.method, "PUT");
  assert.equal(lastRequest.sigValid, true);
  await client.patch("/things/1", { b: 2 });
  assert.equal(lastRequest.method, "PATCH");
  assert.equal(lastRequest.sigValid, true);
  await client.delete("/things/1");
  assert.equal(lastRequest.method, "DELETE");
  assert.equal(lastRequest.sigValid, true);
});
