import test from 'node:test';
import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';
import { createAgentsClient, agentsAccessState, AGENT_SEVERITY } from '../src/platform/agents.js';
import { connectNotificationSocket } from '../src/platform/notifications.js';
import { createCloudgatePlatform } from '../src/platform/index.js';

test('agent calls use the tenant agents routes with explicit bodies and ids only where valid', async () => {
  const calls = [];
  const client = createAgentsClient({ request: async (path, options) => { calls.push({ path, body: options.body }); return { ok: true }; } });
  await client.overview(); await client.attention({ skip: 5, take: 10, includeHandled: true, agentId: 'not-a-guid' });
  await client.attention({ agentId: '11111111-2222-3333-4444-555555555555' });
  await client.acknowledge('i-1'); await client.dismiss('i-2'); await client.reopen('i-3'); await client.approve('i-4');
  assert.deepEqual(calls, [
    { path: 'agents/overview', body: {} },
    { path: 'agents/attention', body: { skip: 5, take: 10, includeHandled: true } },
    { path: 'agents/attention', body: { skip: 0, take: 25, includeHandled: false, agentId: '11111111-2222-3333-4444-555555555555' } },
    { path: 'agents/insights/ack', body: { id: 'i-1', dismiss: false } },
    { path: 'agents/insights/ack', body: { id: 'i-2', dismiss: true } },
    { path: 'agents/insights/reopen', body: { id: 'i-3' } },
    { path: 'agents/insights/approve', body: { id: 'i-4' } },
  ]);
  assert.equal(typeof createCloudgatePlatform({ idpBaseUrl: 'https://api.example.test', tenancyName: 'acme' }).agents.chatSend, 'function');
});

test('talking to an agent goes through the normal chat routes, never a private agent chat', async () => {
  const calls = [];
  const client = createAgentsClient({ request: async (path, options) => { calls.push({ path, body: options.body }); return {}; } });
  await client.chatMessages({ conversationId: 'c-1' });
  await client.chatMessages({ conversationId: 'c-1', beforeUtc: '2026-10-03T00:00:00Z', take: 20 });
  await client.chatThread({ conversationId: 'c-1', rootMessageId: 'm-1' });
  await client.chatSend({ conversationId: 'c-1', content: 'hello' });
  await client.chatSend({ conversationId: 'c-1', content: 'approved', replyToMessageId: 'm-1' });
  await client.chatRead('c-1');
  assert.deepEqual(calls, [
    { path: 'agents/chat/messages', body: { conversationId: 'c-1', take: 50 } },
    { path: 'agents/chat/messages', body: { conversationId: 'c-1', take: 20, beforeUtc: '2026-10-03T00:00:00Z' } },
    { path: 'agents/chat/thread', body: { conversationId: 'c-1', rootMessageId: 'm-1' } },
    { path: 'agents/chat/send', body: { conversationId: 'c-1', content: 'hello' } },
    { path: 'agents/chat/send', body: { conversationId: 'c-1', content: 'approved', replyToMessageId: 'm-1' } },
    { path: 'agents/chat/read', body: { conversationId: 'c-1' } },
  ]);
  assert.equal(Object.keys(client).some(name => /stream|conversation/i.test(name)), false);
});

test('access state maps facade refusals to dock decisions', () => {
  assert.equal(agentsAccessState({ status: 403, body: { code: 'agents-link-required' } }), 'unlinked');
  assert.equal(agentsAccessState({ status: 403, body: { code: 'agents-permission-required' } }), 'forbidden');
  assert.equal(agentsAccessState({ status: 403 }), 'forbidden');
  assert.equal(agentsAccessState({ status: 404, code: 'unavailable' }), 'unavailable');
  assert.equal(agentsAccessState({ code: 'network' }), 'error');
  assert.equal(AGENT_SEVERITY.critical, 2);
});

class FakeSocket {
  static sockets = [];
  constructor(url) { this.url = url; this.readyState = 0; this.sent = []; FakeSocket.sockets.push(this); }
  open() { this.readyState = 1; this.onopen?.(); }
  send(value) { this.sent.push(value); }
  message(value) { this.onmessage?.({ data: JSON.stringify(value) }); }
  close() { this.readyState = 3; this.onclose?.(); }
}

test('agent frames on the notification socket reach onAgents without refreshing the inbox', async () => {
  FakeSocket.sockets = [];
  let changes = 0; const agents = [];
  const stop = connectNotificationSocket({ apiUrl: 'https://api.example.test', environment: 'sbx', getAccessToken: async () => 'token', onChange: () => changes++, onAgents: message => agents.push(message), WebSocketImpl: FakeSocket, retryDelayMs: 1 });
  try {
    for (let i = 0; i < 100 && !FakeSocket.sockets.length; i++) await delay(5);
    const socket = FakeSocket.sockets[0]; socket.open();
    socket.message({ type: 'ready', environment: 'sbx' });
    socket.message({ type: 'agentsChanged', environment: 'sbx', agentId: 'a-1', conversationId: 'c-1', isShared: true, kind: 'proactive' });
    socket.message({ type: 'agentsChanged', environment: 'prod', agentId: 'a-1' });
    socket.message({ type: 'notificationsChanged', environment: 'sbx' });
    assert.equal(changes, 2);
    assert.deepEqual(agents.map(message => message.type), ['ready', 'agentsChanged']);
    assert.equal(agents[1].kind, 'proactive');
  } finally { stop(); }
});
