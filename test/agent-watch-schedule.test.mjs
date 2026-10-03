import test from 'node:test';
import assert from 'node:assert/strict';
import { routeMatches, lastCallFor, gatewayRoutesFromEntries, localScheduleToUtc, utcScheduleToLocal, describeCadence, WATCH_INTERVALS } from '../src/platform/agent-watch.js';
import { createAgentsClient } from '../src/platform/agents.js';

test('declared routes match the concrete calls a page made, in any parameter spelling', () => {
  assert.equal(routeMatches('orders/list', '/orders/List?status=open'), true);
  for (const template of ['orders/${id}', 'orders/{id}', 'orders/:id']) {
    assert.equal(routeMatches(template, 'orders/42'), true, template);
    assert.equal(routeMatches(template, 'orders/42/items'), false, template);
    assert.equal(routeMatches(template, template), true, template);
  }
  assert.equal(routeMatches('a.b/c', 'aXb/c'), false, 'literal characters are not patterns');
  assert.equal(routeMatches('orders/list', 'orders/other'), false);
  assert.equal(routeMatches('', 'orders'), false);
});

test('a scheduled check replays the newest matching call with its query', () => {
  const entries = [
    { name: 'http://app.localhost:44301/sbx/risk/cases?status=active&take=1', startTime: 100 },
    { name: 'http://app.localhost:44301/sbx/risk/cases?status=closed', startTime: 300 },
    { name: 'http://app.localhost:44301/sbx/balance/profiles/AA36?x=1', startTime: 200 },
  ];
  assert.equal(gatewayRoutesFromEntries(entries, 'http://app.localhost:44301')[0].url, 'risk/cases?status=closed');
  assert.equal(lastCallFor(entries, 'http://app.localhost:44301', 'risk/cases'), 'risk/cases?status=closed');
  assert.equal(lastCallFor(entries, 'http://app.localhost:44301', 'balance/profiles/${profileId}'), 'balance/profiles/AA36?x=1');
  assert.equal(lastCallFor(entries, 'http://app.localhost:44301', 'never/called'), '');
});

test('local schedule times convert to UTC and back across midnight and week boundaries', () => {
  // UTC+2 (Johannesburg): getTimezoneOffset() is -120.
  assert.deepEqual(localScheduleToUtc({ time: '08:00' }, -120), { timeOfDayUtcMinutes: 360 });
  assert.deepEqual(localScheduleToUtc({ time: '01:00', day: 1 }, -120), { timeOfDayUtcMinutes: 1380, dayOfWeek: 0 });
  assert.deepEqual(localScheduleToUtc({ time: '00:30', day: 0 }, -120), { timeOfDayUtcMinutes: 1350, dayOfWeek: 6 });
  // UTC-5: offset 300.
  assert.deepEqual(localScheduleToUtc({ time: '22:00', day: 6 }, 300), { timeOfDayUtcMinutes: 180, dayOfWeek: 0 });
  assert.deepEqual(localScheduleToUtc({ time: 'soon' }, 0), {});
  assert.deepEqual(localScheduleToUtc({ time: '25:00' }, 0), {});
  for (const offset of [-120, 0, 300, -330]) for (const local of [{ time: '08:00', day: 1 }, { time: '00:15', day: 0 }, { time: '23:45', day: 6 }])
    assert.deepEqual(utcScheduleToLocal(localScheduleToUtc(local, offset), offset), local);
  assert.deepEqual(utcScheduleToLocal({}, 0), {});
});

test('cadences read naturally in the viewer time zone', () => {
  assert.equal(describeCadence({ intervalMinutes: 15 }), 'Every 15 minutes');
  assert.equal(describeCadence({ intervalMinutes: 60 }), 'Every hour');
  assert.equal(describeCadence({ intervalMinutes: 360 }), 'Every 6 hours');
  assert.equal(describeCadence({ intervalMinutes: 1440 }), 'Every day');
  assert.equal(describeCadence({ intervalMinutes: 1440, timeOfDayUtcMinutes: 360 }, -120), 'Every day at 08:00');
  assert.equal(describeCadence({ intervalMinutes: 10080, timeOfDayUtcMinutes: 1380, dayOfWeek: 0 }, -120), 'Every Monday at 01:00');
  assert.equal(describeCadence({ intervalMinutes: 2880 }), 'Every 2 days');
  assert.deepEqual(WATCH_INTERVALS.map(option => option.minutes), [15, 60, 360, 1440, 10080]);
});

test('schedule calls carry the app scope, only valid optional fields, and explicit tool consent', async () => {
  const calls = [];
  const client = createAgentsClient({ request: async (path, options) => { calls.push({ path, body: options.body }); return {}; }, resolveAppIdentity: async () => ({ environment: 'sbx' }) });
  await client.watchScheduleSet({ agentId: 'a', endpointId: 'e', prompt: 'Alert when more than 20 are pending' });
  await client.watchScheduleSet({ id: '11111111-2222-3333-4444-555555555555', agentId: 'a', endpointId: 'e', prompt: 'p', intervalMinutes: 10080, timeOfDayUtcMinutes: 360, dayOfWeek: 1,
    sampleUrl: 'risk/cases?status=active', enableWorkflowRuns: true, isEnabled: false });
  await client.watchScheduleSet({ id: 'not-a-guid', agentId: 'a', endpointId: 'e', prompt: 'p', timeOfDayUtcMinutes: 'x' });
  await client.watchScheduleRun('t-1'); await client.watchScheduleDelete('t-1'); await client.watchScheduleTest('t-1');
  const scope = { environment: 'sbx', projectPath: '*' };
  assert.deepEqual(calls, [
    { path: 'agents/watch/schedule/set', body: { ...scope, agentId: 'a', endpointId: 'e', prompt: 'Alert when more than 20 are pending', intervalMinutes: 60, isEnabled: true, enableWorkflowRuns: false } },
    { path: 'agents/watch/schedule/set', body: { ...scope, id: '11111111-2222-3333-4444-555555555555', agentId: 'a', endpointId: 'e', prompt: 'p', intervalMinutes: 10080, isEnabled: false,
      timeOfDayUtcMinutes: 360, dayOfWeek: 1, sampleUrl: 'risk/cases?status=active', enableWorkflowRuns: true } },
    { path: 'agents/watch/schedule/set', body: { ...scope, agentId: 'a', endpointId: 'e', prompt: 'p', intervalMinutes: 60, isEnabled: true, enableWorkflowRuns: false } },
    { path: 'agents/watch/schedule/run', body: { id: 't-1' } },
    { path: 'agents/watch/schedule/delete', body: { id: 't-1' } },
    { path: 'agents/watch/schedule/test', body: { id: 't-1' } },
  ]);
});
