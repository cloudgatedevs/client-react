import test from 'node:test';
import assert from 'node:assert/strict';
import { createProfileClient, normalizeProfile } from '../src/platform/profile.js';
import { createRegistrationClient } from '../src/platform/registration.js';
import { createIdpClient } from '../src/platform/transport.js';

test('email reminders use tenant IdP settings and only accept boolean flags', async () => {
  const calls = [];
  const client = createRegistrationClient({ request: async (path, options) => { calls.push({ path, ...options }); return { allowSelfRegistration: false, promptForEmailVerification: true, scope: 'tenant' }; } });
  assert.equal((await client.get()).promptForEmailVerification, true);
  await client.update({ allowSelfRegistration: false, promptForEmailVerification: true, tenantId: 99 });
  assert.deepEqual(calls[1].body, { allowSelfRegistration: false, promptForEmailVerification: true });
  await assert.rejects(client.update({ allowSelfRegistration: false, promptForEmailVerification: 'false' }), /prompt/);
  assert.equal(calls.length, 2);
  assert.equal(normalizeProfile({ id: 1, isEmailConfirmed: false, promptForEmailVerification: true }).promptForEmailVerification, true);
  assert.equal(normalizeProfile({ Id: 1, IsEmailConfirmed: true, PromptForEmailVerification: false }).promptForEmailVerification, false);
  assert.equal(normalizeProfile({ id: 1 }).promptForEmailVerification, undefined);
});

test('resend uses the authenticated self-service endpoint with no caller-selected recipient', async () => {
  const request = createIdpClient({ apiUrl: 'https://api.test', auth: { tenancyName: 'tenant name', authHeader: () => ({ Authorization: 'Bearer idp-user' }) }, fetchImpl: async (url, init) => {
    assert.equal(url, 'https://api.test/api/idp/tenant%20name/profile/resend-verification');
    assert.equal(init.method, 'POST'); assert.equal(init.headers.Authorization, 'Bearer idp-user');
    assert.deepEqual(JSON.parse(init.body), {});
    return Response.json({ sent: true, isEmailConfirmed: false, retryAfterSeconds: 60 });
  } });
  assert.equal((await createProfileClient({ request }).resendVerification({ body: { email: 'another@example.invalid' } })).sent, true);
  await assert.rejects(createProfileClient({ request: async () => ({}) }).resendVerification(), /could not confirm/);
  await assert.rejects(createProfileClient({ request: async () => { throw new Error('Email failed'); } }).resendVerification(), /Email failed/);
});
