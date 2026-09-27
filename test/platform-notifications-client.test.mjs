import test from 'node:test';
import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';
import { safeNotificationLink, createNotificationsClient, connectNotificationSocket } from '../src/platform/notifications.js';

test('notification actions allow local/http links and reject browser-normalized unsafe destinations', () => {
  for (const url of ['/orders/1?tab=receipt#details', 'https://example.test/reports', 'http://localhost:5173/orders']) assert.equal(safeNotificationLink(url), url);
  for (const url of ['javascript:alert(1)', '//evil.test', '/%2fevil.test', '/%255cevil.test', 'https://user:pass@example.test', 'data:text/html,hi', '/test%0aevil', '\\evil.test', 'relative/path', '']) assert.equal(safeNotificationLink(url), null, url);
});

test('inbox requests use the resolved environment and never accept a recipient selector', async () => {
  const calls = [];
  const client = createNotificationsClient({ resolveAppIdentity: async () => ({ environment: 'prod' }), request: async (path, options) => { calls.push({ path, ...options }); return { ok: true }; } });
  await client.list({ skip: 25, take: 25, unreadOnly: true, userId: 999, environment: 'sbx' });
  await client.unreadCount(); await client.read('notification-id'); await client.readAll();
  assert.deepEqual(calls, [
    { path: 'notifications/list', body: { environment: 'prod', skip: 25, take: 25, unreadOnly: true } },
    { path: 'notifications/unread-count', body: { environment: 'prod' } },
    { path: 'notifications/read', body: { environment: 'prod', id: 'notification-id' } },
    { path: 'notifications/read-all', body: { environment: 'prod' } },
  ]);
  await assert.rejects(() => createNotificationsClient({ resolveAppIdentity: async () => ({ environment: 'oops' }) }).list(), /valid notification environment/);
});

const until = async check => { for (let i = 0; i < 100; i++) { if (check()) return; await delay(5); } assert.fail('Socket condition did not occur'); };
class FakeSocket {
  static sockets = [];
  constructor(url) { this.url = url; this.readyState = 0; this.sent = []; FakeSocket.sockets.push(this); }
  open() { this.readyState = 1; this.onopen?.(); }
  send(value) { this.sent.push(value); }
  message(value) { this.onmessage?.({ data: typeof value === 'string' ? value : JSON.stringify(value) }); }
  close() { this.readyState = 3; this.onclose?.(); }
}

test('native socket refreshes on ready/change, reconnects with a fresh token, and cleans up', async () => {
  FakeSocket.sockets = [];
  let tokens = 0, changes = 0;
  const status = [];
  const stop = connectNotificationSocket({ apiUrl: 'https://api.example.test/', environment: 'sbx', getAccessToken: async () => `token-${++tokens}`, onChange: () => changes++, onStatus: value => status.push(value), WebSocketImpl: FakeSocket, retryDelayMs: 1, heartbeatMs: 5 });
  try {
    await until(() => FakeSocket.sockets.length === 1);
    const first = FakeSocket.sockets[0]; const url = new URL(first.url);
    assert.equal(url.protocol, 'wss:'); assert.equal(url.pathname, '/ws-idp-notifications'); assert.equal(url.searchParams.get('access_token'), 'token-1');
    assert.equal(url.searchParams.get('environment'), 'sbx'); assert.equal(url.searchParams.has('userId'), false);
    first.open(); first.message({ type: 'ready', environment: 'sbx' }); first.message({ type: 'notificationsChanged', environment: 'sbx' });
    first.message({ type: 'notificationsChanged', environment: 'prod' }); first.message('invalid-json');
    assert.equal(changes, 2);
    await until(() => first.sent.includes('ping'));
    first.close(); await until(() => FakeSocket.sockets.length === 2);
    const second = FakeSocket.sockets[1]; assert.equal(new URL(second.url).searchParams.get('access_token'), 'token-2');
    second.open(); second.message({ type: 'ready', environment: 'sbx' }); assert.equal(changes, 3);
    first.message({ type: 'notificationsChanged', environment: 'sbx' }); assert.equal(changes, 3, 'Ignore stale connections');
    stop(); await delay(20); assert.equal(second.readyState, 3); assert.equal(FakeSocket.sockets.length, 2);
    assert.ok(status.includes('connected')); assert.ok(status.includes('disconnected'));
  } finally { stop(); }
});

test('unmount during token refresh prevents a socket from opening', async () => {
  FakeSocket.sockets = [];
  let resolveToken;
  const stop = connectNotificationSocket({ apiUrl: 'https://example.test', environment: 'sbx', getAccessToken: () => new Promise(resolve => { resolveToken = resolve; }), onChange() {}, WebSocketImpl: FakeSocket });
  await until(() => resolveToken); stop(); resolveToken('late-token'); await delay(10);
  assert.equal(FakeSocket.sockets.length, 0);
});
