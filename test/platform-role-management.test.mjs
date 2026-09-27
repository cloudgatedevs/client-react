import test from 'node:test';
import assert from 'node:assert/strict';
import { createCloudgatePlatform, validateRole } from '../src/platform/index.js';

test('roles and assignments use only the tenant IdP bearer and preserve permission values', async () => {
  const calls = [];
  const client = createCloudgatePlatform({ apiUrl: 'https://api.example.invalid', tenancyName: 'tenant one',
    auth: { tenancyName: 'tenant one', getAccessToken: () => 'idp-session', authHeader: () => ({ Authorization: 'Bearer idp-session' }) },
    fetch: async (url, init) => { calls.push({ url, ...init }); return Response.json({ result: { id: 17, name: 'Support' } }); } });
  const values = { name: 'Support', permissions: [{ key: 'orders.view', value: 'true' }] };
  await client.roles.list(); await client.roles.create(values); await client.roles.update({ ...values, id: 17 });
  await client.roles.delete(17); await client.users.setRole(23, 'Support');
  assert.deepEqual(calls.map(call => call.url), ['roles/list', 'roles/create', 'roles/update', 'roles/delete', 'users/set-role'].map(p => `https://api.example.invalid/api/idp/tenant%20one/admin/${p}`));
  for (const call of calls) { assert.equal(call.headers.Authorization, 'Bearer idp-session'); assert.equal(call.headers['X-Authentication-Signature'], undefined); }
  assert.deepEqual(JSON.parse(calls[1].body), values);
  assert.deepEqual(JSON.parse(calls[4].body), { id: 23, role: 'Support' });
});

test('role operations expose backend failures and cannot run anonymously', async () => {
  let signedIn = true, calls = 0;
  const client = createCloudgatePlatform({ apiUrl: 'https://api.example.invalid', tenancyName: 'qa',
    auth: { tenancyName: 'qa', getAccessToken: () => signedIn ? 'idp' : null, authHeader: () => signedIn ? { Authorization: 'Bearer idp' } : {} },
    fetch: async () => { calls++; return Response.json({ message: 'This role is assigned to users.' }, { status: 400 }); } });
  await assert.rejects(client.roles.delete(8), /assigned to users/);
  signedIn = false;
  await assert.rejects(client.roles.create({ name: 'Support', permissions: [] }), /Sign in/);
  assert.equal(calls, 1);
});

test('role form validation covers Unicode names, duplicate permission keys and limits', () => {
  const input = { name: ' Équipe 2 ', permissions: [{ key: 'orders.view', value: 'true' }] };
  assert.equal(validateRole(input), null);
  assert.match(validateRole({ ...input, name: '<script>' }), /Role names/);
  assert.match(validateRole({ ...input, permissions: [...input.permissions, { key: ' ORDERS.VIEW ', value: '' }] }), /unique/);
  assert.match(validateRole({ ...input, permissions: [{ key: '', value: 'true' }] }), /Each permission/);
  assert.match(validateRole({ ...input, permissions: [{ key: 'orders/view', value: 'true' }] }), /Each permission/);
  assert.match(validateRole({ ...input, permissions: [{ key: 'x'.repeat(129), value: '' }] }), /Each permission/);
  assert.match(validateRole({ ...input, permissions: [{ key: 'x', value: 'x'.repeat(513) }] }), /512/);
  assert.match(validateRole({ ...input, permissions: Array(201).fill(input.permissions[0]) }), /200/);
});
