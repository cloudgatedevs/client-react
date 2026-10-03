import test from 'node:test';
import assert from 'node:assert/strict';
import { agentWatchProps, readWatchTarget, watchRouteKey, gatewayRoutesFromEntries } from '../src/platform/agent-watch.js';
import { createAgentsClient } from '../src/platform/agents.js';

test('agentWatchProps marks data components and actions, and ignores empty or invalid input', () => {
  assert.deepEqual(agentWatchProps('orders/list'), { 'data-cg-feed': 'orders/list' });
  assert.deepEqual(agentWatchProps({ route: '/deposits/create', method: 'post', label: ' Create deposit ' }),
    { 'data-cg-feed': 'deposits/create', 'data-cg-feed-method': 'POST', 'data-cg-feed-label': 'Create deposit' });
  assert.deepEqual(agentWatchProps({ route: 'orders/${id}', method: 'TRACE' }), { 'data-cg-feed': 'orders/${id}' });
  for (const empty of [undefined, null, '', {}, { route: '  ' }]) assert.deepEqual(agentWatchProps(empty), {});
});

const element = attributes => ({ textContent: attributes.text ?? '', getAttribute: name => attributes[name] ?? null });

test('readWatchTarget reads the declaration and falls back to accessible text for the label', () => {
  assert.deepEqual(readWatchTarget(element({ 'data-cg-feed': 'deposits/create', 'data-cg-feed-method': 'POST', 'data-cg-feed-label': 'Create deposit' })),
    { key: 'POST deposits/create', path: 'deposits/create', method: 'POST', label: 'Create deposit' });
  assert.equal(readWatchTarget(element({ 'data-cg-feed': 'orders/list', 'aria-label': 'Orders' })).label, 'Orders');
  assert.equal(readWatchTarget(element({ 'data-cg-feed': 'orders/list', text: '  New   order ' })).label, 'New order');
  assert.equal(readWatchTarget(element({ 'data-cg-feed': 'orders/list' })).label, 'orders/list');
  assert.equal(readWatchTarget(element({})), null);
  assert.equal(readWatchTarget(null), null);
  assert.equal(watchRouteKey({ path: 'orders/list' }), 'orders/list');
});

test('page routes come from gateway resource timings only, newest first and deduplicated', () => {
  const entries = [
    { name: 'http://open-admin.localhost:44301/sbx/risk/cases?status=active', startTime: 100 },
    { name: 'http://open-admin.localhost:44301/sbx/risk/cases?status=closed', startTime: 300 },
    { name: 'http://open-admin.localhost:44301/sbx/balance/profiles/AA%2036', startTime: 200 },
    { name: 'http://open-admin.localhost:44301/api/idp/open-admin/profile', startTime: 250 },
    { name: 'http://localhost:44301/sbx/other/tenant', startTime: 260 },
    { name: 'http://open-admin.localhost:44301/sbx', startTime: 270 },
    { name: 'not a url', startTime: 280 },
    { name: 'http://open-admin.localhost:44301/prod/old/page', startTime: 10 },
  ];
  const routes = gatewayRoutesFromEntries(entries, 'http://open-admin.localhost:44301/sbx/', 50);
  assert.deepEqual(routes.map(route => route.path), ['risk/cases', 'balance/profiles/AA 36']);
  assert.equal(routes[0].method, '');
  assert.equal(gatewayRoutesFromEntries(entries, 'http://open-admin.localhost:44301').length, 3);
  assert.deepEqual(gatewayRoutesFromEntries(entries, ''), []);
  assert.equal(gatewayRoutesFromEntries(entries, 'http://open-admin.localhost:44301', 0, 1).length, 1);
});

test('watch calls carry the app scope and never more than the routes asked about', async () => {
  const calls = [];
  const client = createAgentsClient({ request: async (path, options) => { calls.push({ path, body: options.body }); return {}; },
    resolveAppIdentity: async () => ({ environment: 'production' }), projectPath: '/orders/' });
  await client.watchResolve([{ path: 'orders/list' }, { path: 'orders/create', method: 'POST', key: 'k' }, { path: '' }, null]);
  await client.watchList({ agentId: '11111111-2222-3333-4444-555555555555' });
  await client.watchList({ agentId: 'nope' });
  await client.watchSet({ agentId: 'a', endpointId: 'e', watchPrompt: 'Tell me about failures' });
  await client.watchSet({ agentId: 'a', endpointId: 'e', attached: false });
  const scope = { environment: 'prod', projectPath: 'orders' };
  assert.deepEqual(calls, [
    { path: 'agents/watch/resolve', body: { ...scope, routes: [{ key: 'orders/list', path: 'orders/list', method: '' }, { key: 'k', path: 'orders/create', method: 'POST' }] } },
    { path: 'agents/watch/list', body: { ...scope, agentId: '11111111-2222-3333-4444-555555555555' } },
    { path: 'agents/watch/list', body: scope },
    { path: 'agents/watch/set', body: { ...scope, agentId: 'a', endpointId: 'e', attached: true, watchPrompt: 'Tell me about failures', watchSandbox: true, watchProduction: true } },
    { path: 'agents/watch/set', body: { ...scope, agentId: 'a', endpointId: 'e', attached: false, watchPrompt: '', watchSandbox: true, watchProduction: true } },
  ]);
  const fallback = [];
  await createAgentsClient({ request: async (path, options) => { fallback.push(options.body); return {}; } }).watchList();
  assert.deepEqual(fallback, [{ environment: 'sbx', projectPath: '*' }]);
});
