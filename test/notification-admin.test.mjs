import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createNotificationAdminClient, validateNotification } from '../src/platform/notification-admin.js';

const id = '12345678-1234-1234-1234-123456789abc';
const draft = { environment: 'sbx', allUsers: false, userId: 7, title: ' Ready ', body: ' Open report ', style: 'success', actionUrl: '/reports', actionLabel: 'View' };
test('admin sends use explicit environment, bearer endpoint and whitelisted fields', async () => {
  const calls = [], signal = new AbortController().signal;
  const client = createNotificationAdminClient({ request: async (path, options) => { calls.push({ path, ...options }); return { id, recipientCount: 1 }; }, resolveAppIdentity: async () => ({ environment: 'sbx' }) });
  assert.deepEqual(await client.send({ ...draft, environment: 'production', tenantId: 88, senderId: 9, nodeId: id }, { signal }), { id, recipientCount: 1 });
  assert.equal(calls[0].path, 'admin/notifications/send'); assert.equal(calls[0].method, 'POST'); assert.equal(calls[0].signal, signal);
  assert.deepEqual(calls[0].body, { allUsers: false, userId: 7, title: 'Ready', body: 'Open report', style: 'success', actionUrl: '/reports', actionLabel: 'View', environment: 'prod' });
  await client.send({ ...draft, allUsers: true, userId: undefined });
  assert.equal(Object.hasOwn(calls[1].body, 'userId'), false);
  assert.equal(calls[1].body.environment, 'sbx');
});

test('history defaults to deployed environment and recipient filters are explicit', async () => {
  const calls = [], page = { items: [], totalCount: 0 };
  const client = createNotificationAdminClient({ request: async (path, options) => { calls.push({ path, ...options }); return page; }, resolveAppIdentity: async () => ({ environment: 'production' }) });
  assert.deepEqual(await client.history({ tenantId: 55, userId: 12 }), page);
  assert.deepEqual(calls[0].body, { skip: 0, take: 25, environment: 'prod' });
  await client.recipients({ id, environment: 'sandbox', isRead: false, skip: 25, take: 25 });
  assert.equal(calls[1].path, 'admin/notifications/recipients');
  assert.deepEqual(calls[1].body, { id, isRead: false, skip: 25, take: 25, environment: 'sbx' });
});

test('invalid scope, paging and targets never make an API call', async () => {
  let calls = 0;
  const client = createNotificationAdminClient({ request: async () => { calls++; }, resolveAppIdentity: async () => ({ environment: 'bad' }) });
  await assert.rejects(client.history());
  await assert.rejects(client.history({ environment: 'sbx', take: 101 }));
  await assert.rejects(client.history({ environment: 'sbx', skip: -1 }));
  await assert.rejects(client.recipients({ id: 'bad', environment: 'prod' }));
  await assert.rejects(client.recipients({ id, environment: 'prod', isRead: 'false' }));
  for (const extra of [{ environment: undefined }, { environment: 'bad' }, { allUsers: 'false' }, { allUsers: true }, { userId: 0 }, { userId: '7' }, { userId: Number.MAX_SAFE_INTEGER + 1 }]) await assert.rejects(client.send({ ...draft, ...extra }));
  assert.equal(calls, 0);
});

test('notification input matches server limits, required fields, styles and safe links', () => {
  assert.equal(validateNotification(draft), null);
  for (const extra of [{ title: ' ' }, { body: '' }, { title: 'x'.repeat(161) }, { body: 'x'.repeat(4001) }, { actionUrl: '/' + 'x'.repeat(2048) }, { actionLabel: 'x'.repeat(81) }, { style: 'urgent' }, { actionUrl: '', actionLabel: 'Read' }]) assert.ok(validateNotification({ ...draft, ...extra }));
  for (const actionUrl of ['javascript:alert(1)', '//evil.test', '/%2fevil.test', '/%255cevil.test', 'https://u:pass@example.com', 'data:text/html,hi', '/test%0aevil']) assert.ok(validateNotification({ ...draft, actionUrl }));
  for (const style of ['info', 'success', 'warning', 'danger']) assert.equal(validateNotification({ ...draft, style }), null);
  assert.equal(validateNotification({ ...draft, title: 'x'.repeat(160), body: 'x'.repeat(4000), actionUrl: 'https://example.com/report' }), null);
});

test('failures and ambiguous send results are propagated without automatic resend', async () => {
  let calls = 0;
  const failure = Object.assign(new Error('Network lost'), { code: 'network' });
  const client = createNotificationAdminClient({ request: async () => { calls++; throw failure; } });
  await assert.rejects(client.send(draft), error => error === failure); assert.equal(calls, 1);
  for (const result of [null, {}, { id, recipientCount: -1 }]) await assert.rejects(createNotificationAdminClient({ request: async () => result }).send(draft), /Check sent history/);
  await assert.rejects(createNotificationAdminClient({ request: async () => ({ items: null, totalCount: 0 }) }).history({ environment: 'sbx' }), /invalid notification list/);
});
