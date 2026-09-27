import test from 'node:test';
import assert from 'node:assert/strict';
import { createRegistrationClient } from '../src/platform/registration.js';
import { createIdpClient } from '../src/platform/transport.js';

test('Registration uses tenant-bound bearer requests and writes only the registration flag', async () => {
  const calls = []; let enabled = false;
  const request = createIdpClient({ auth: { tenancyName: 'tenant name', authHeader: () => ({ Authorization: 'Bearer idp' }) }, apiUrl: 'https://api.test',
    fetchImpl: async (url, init) => { calls.push({ url, ...init }); if (init.method === 'PUT') enabled = JSON.parse(init.body).allowSelfRegistration; return Response.json({allowSelfRegistration:enabled,scope:'tenant'}); } });
  const client = createRegistrationClient({ request });
  assert.equal((await client.get()).allowSelfRegistration, false);
  assert.equal((await client.update({ allowSelfRegistration: true, tenantId: 999, recaptchaSecret: 'ignored' })).allowSelfRegistration, true);
  assert.equal((await client.get()).allowSelfRegistration, true);
  assert.equal((await client.update({ allowSelfRegistration: false })).allowSelfRegistration, false);
  assert.equal(calls[0].method, 'GET'); assert.equal(calls[0].body, undefined);
  assert.equal(calls[1].url, 'https://api.test/api/idp/tenant%20name/admin/registration');
  assert.equal(calls[1].headers.Authorization, 'Bearer idp');
  assert.deepEqual(JSON.parse(calls[1].body), { allowSelfRegistration: true });
});

test('Missing or malformed registration values fail instead of silently disabling registration', async () => {
  let calls = 0;
  const client = createRegistrationClient({ request: async () => { calls++; return {}; } });
  for (const values of [undefined, {}, {allowSelfRegistration:'false'}, {allowSelfRegistration:null}])
    await assert.rejects(client.update(values), /Choose whether/);
  assert.equal(calls, 0);
  await assert.rejects(client.get(), /invalid registration setting/);
});

test('Link or permission failures preserve the server reason for the profile recovery link', async () => {
  const client = createRegistrationClient({ request: createIdpClient({apiUrl:'https://api.test', auth:{tenancyName:'tenant',authHeader:()=>({Authorization:'Bearer idp'})},
    fetchImpl:async()=>Response.json({code:'idp-admin-required',message:'Your IdP account needs the Admin role.'},{status:403})}) });
  await assert.rejects(client.get(), error => error.status===403 && error.body.code==='idp-admin-required');
});
