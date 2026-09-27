import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createCloudgateWebSockets,
  parseWebSocketBase,
} from "../src/index.js";

// ------------------------------------------------------------
// Fake WebSocket implementation for tests
// ------------------------------------------------------------
class FakeWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
  static instances = [];

  constructor(url) {
    this.url = url;
    this.readyState = FakeWebSocket.CONNECTING;
    this.onopen = null;
    this.onmessage = null;
    this.onerror = null;
    this.onclose = null;
    FakeWebSocket.instances.push(this);
  }

  simulateOpen() {
    this.readyState = FakeWebSocket.OPEN;
    this.onopen?.();
  }

  simulateMessage(data) {
    this.onmessage?.({ data });
  }

  simulateClose(code = 1006) {
    this.readyState = FakeWebSocket.CLOSED;
    this.onclose?.({ code, reason: "" });
  }

  close() {
    this.readyState = FakeWebSocket.CLOSED;
    this.onclose?.({ code: 1000, reason: "client" });
  }
}

function makeManager(overrides = {}) {
  FakeWebSocket.instances = [];
  return createCloudgateWebSockets({
    baseUrl: "https://acme.cloudgate.dev",
    environment: "sbx",
    username: "user",
    password: "pass!123",
    WebSocket: FakeWebSocket,
    logger: false,
    ...overrides,
  });
}

test("parseWebSocketBase derives origin and env", () => {
  assert.deepEqual(parseWebSocketBase("https://acme.cloudgate.dev/sbx"), {
    wsOrigin: "wss://acme.cloudgate.dev",
    env: "sbx",
  });
  assert.deepEqual(parseWebSocketBase("http://localhost:44301"), {
    wsOrigin: "ws://localhost:44301",
    env: "",
  });
  assert.equal(parseWebSocketBase(""), null);
});

test("connect builds /ws/{env}/{channel} with Basic auth and filter", () => {
  const sockets = makeManager();
  sockets.connect("table-session", { filter: '"Id":31', onMessage: () => {} });

  assert.equal(FakeWebSocket.instances.length, 1);
  const url = new URL(FakeWebSocket.instances[0].url);
  assert.equal(url.protocol, "wss:");
  assert.equal(url.pathname, "/ws/sbx/table-session");
  assert.equal(url.searchParams.get("filter"), '"Id":31');
  const auth = url.searchParams.get("Authorization");
  assert.ok(auth?.startsWith("Basic "));
  assert.equal(atob(auth.slice("Basic ".length)), "user:pass!123");
  sockets.dispose();
});

test("environment embedded in baseUrl is used when no explicit env", () => {
  const sockets = createCloudgateWebSockets({
    baseUrl: "https://acme.cloudgate.dev/prod",
    username: "u",
    password: "p",
    WebSocket: FakeWebSocket,
    logger: false,
  });
  FakeWebSocket.instances = [];
  sockets.connect("order-items", { onMessage: () => {} });
  assert.ok(FakeWebSocket.instances[0].url.includes("/ws/prod/order-items"));
  sockets.dispose();
});

test("multiple channels share one manager / one set of credentials", () => {
  const sockets = makeManager();
  const k1 = sockets.connect("table-session", { onMessage: () => {} });
  const k2 = sockets.connect("order-items", { onMessage: () => {} });
  const k3 = sockets.connect("session-guests", { filter: '"table_session_id":9', onMessage: () => {} });

  assert.equal(FakeWebSocket.instances.length, 3);
  assert.notEqual(k1, k2);
  assert.notEqual(k2, k3);
  for (const inst of FakeWebSocket.instances) {
    assert.ok(new URL(inst.url).searchParams.get("Authorization"));
  }
  sockets.dispose();
});

test("JSON frames are parsed; non-JSON delivered as raw strings", () => {
  const sockets = makeManager();
  const seen = [];
  sockets.connect("table-session", { onMessage: (p) => seen.push(p) });

  const ws = FakeWebSocket.instances[0];
  ws.simulateOpen();
  ws.simulateMessage('{"Id": 7, "session_status": "active"}');
  ws.simulateMessage("plain text");

  assert.deepEqual(seen[0], { Id: 7, session_status: "active" });
  assert.equal(seen[1], "plain text");
  sockets.dispose();
});

test("re-connecting the same channel+filter reuses the socket", () => {
  const sockets = makeManager();
  const k1 = sockets.connect("table-session", { onMessage: () => {} });
  FakeWebSocket.instances[0].simulateOpen();
  const k2 = sockets.connect("table-session", { onMessage: () => {} });
  assert.equal(k1, k2);
  assert.equal(FakeWebSocket.instances.length, 1);
  sockets.dispose();
});

test("unexpected close schedules a reconnect", async () => {
  const sockets = makeManager({ reconnect: { initialDelayMs: 10, maxAttempts: 2 } });
  sockets.connect("table-session", { onMessage: () => {} });

  const first = FakeWebSocket.instances[0];
  first.simulateOpen();
  first.simulateClose(1006);

  await new Promise((r) => setTimeout(r, 50));
  assert.equal(FakeWebSocket.instances.length, 2, "a second socket was opened");
  sockets.dispose();
});

test("disconnect stops reconnecting", async () => {
  const sockets = makeManager({ reconnect: { initialDelayMs: 10 } });
  const key = sockets.connect("table-session", { onMessage: () => {} });
  FakeWebSocket.instances[0].simulateOpen();

  sockets.disconnect(key);
  await new Promise((r) => setTimeout(r, 50));
  assert.equal(FakeWebSocket.instances.length, 1, "no reconnect after disconnect");
  sockets.dispose();
});

test("status callbacks fire in order", () => {
  const sockets = makeManager();
  const statuses = [];
  sockets.connect("table-session", {
    onMessage: () => {},
    onStatus: (s) => statuses.push(s),
  });
  const ws = FakeWebSocket.instances[0];
  ws.simulateOpen();
  assert.deepEqual(statuses, ["connecting", "open"]);
  sockets.dispose();
});

test("missing credentials still connects (no Authorization param)", () => {
  const sockets = makeManager({ username: "", password: "" });
  assert.equal(sockets.hasCredentials, false);
  sockets.connect("table-session", { onMessage: () => {} });
  const url = new URL(FakeWebSocket.instances[0].url);
  assert.equal(url.searchParams.get("Authorization"), null);
  sockets.dispose();
});

test("function baseUrl is re-read and can defer connection", () => {
  let base = null;
  const sockets = makeManager({ baseUrl: () => base });
  sockets.connect("table-session", { onMessage: () => {} });
  assert.equal(FakeWebSocket.instances.length, 0, "no socket without a base");

  base = "https://store.cloudgate.dev/sbx";
  sockets.connect("table-session", { onMessage: () => {} });
  assert.equal(FakeWebSocket.instances.length, 1);
  assert.ok(FakeWebSocket.instances[0].url.startsWith("wss://store.cloudgate.dev/ws/sbx/"));
  sockets.dispose();
});
