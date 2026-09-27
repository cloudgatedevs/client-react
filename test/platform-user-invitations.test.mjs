import test from 'node:test';
import assert from 'node:assert/strict';
import { createCloudgatePlatform, createUsersClient } from '../src/platform/index.js';

const webAppId = '11111111-2222-3333-4444-555555555555';
test('local sandbox invitations use the running app origin for lookup, creation and resend', async () => {
  const calls = [];
  const users = createUsersClient({ resolveAppIdentity: async () => ({ webAppId, environment: 'sbx' }), readLocation: () => new URL('http://localhost:3000/users?secret=never-send'),
    request: async (path, options) => { calls.push(options.body); return path.endsWith('invitation-app') ? { webAppId, name: 'Local app', url: 'http://localhost:3000/', isDevelopment: true } : { user: { id: 2 }, invitation: { sent: true } }; } });
  assert.equal((await users.invitationApp()).isDevelopment, true);
  await users.invite({ email: 'user@example.invalid', developmentAppUrl: 'https://evil.example' });
  await users.resendInvite(2);
  assert.ok(calls.every(body => body.webAppId === webAppId && body.developmentAppUrl === 'http://localhost:3000'));
});

test('published and non-local apps never override the server-selected invitation destination', async () => {
  for (const [origin, environment] of [['http://localhost:3000', 'prod'], ['https://example.invalid', 'sbx'], ['http://localhost.evil.example', 'sbx']]) {
    const users = createUsersClient({ resolveAppIdentity: async () => ({ webAppId, environment }), readLocation: () => new URL(origin),
      request: async (_, options) => { assert.deepEqual(options.body, { webAppId }); return { webAppId, name: 'App', url: 'https://app.example.invalid/' }; } });
    await users.invitationApp();
  }
});
test('invitation uses published app identity and IdP bearer without a password or caller-supplied app destination', async () => {
  const calls = [];
  const client = createCloudgatePlatform({ apiUrl: 'https://api.example.invalid', webAppId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    auth: { tenancyName: 'tenant', ensureAccessToken: async () => 'idp-token', getAccessToken: () => 'idp-token', authHeader: () => ({ Authorization: 'Bearer idp-token' }) },
    resolvePublishedApp: async () => ({ webAppId, isProduction: true }),
    fetch: async (url, options) => { calls.push({ url, ...options }); return new Response(JSON.stringify({ user: { id: 2 }, created: true, invitation: { sent: true, appName: 'App', appUrl: 'https://app.example.invalid/' } })); },
  });
  await client.users.invite({ email: ' user@example.invalid ', name: ' Ada ', password: 'must-not-send', role: 'Admin', webAppId: 'wrong', returnUrl: 'https://other.example/' });
  assert.match(calls[0].url, /\/api\/idp\/tenant\/admin\/users\/invite$/);
  assert.equal(calls[0].headers.Authorization, 'Bearer idp-token');
  assert.deepEqual(JSON.parse(calls[0].body), { email: 'user@example.invalid', name: 'Ada', webAppId });
});

test('missing app identity prevents invitation requests', async () => {
  const users = createUsersClient({ request: () => assert.fail('No request expected') });
  await assert.rejects(users.invite({ email: 'user@example.invalid' }), /web app ID/);
  await assert.rejects(users.invitationApp(), /web app ID/);
  await assert.rejects(users.resendInvite(2), /web app ID/);
});

test('delivery failure is returned with the created user so only email delivery is retried', async () => {
  const calls = [];
  const users = createUsersClient({ resolveAppIdentity: async () => ({ webAppId }), request: async (path, options) => {
    calls.push({ path, body: options.body });
    return { user: { id: 2 }, created: calls.length === 1, invitation: { sent: calls.length > 1 } };
  } });
  const result = await users.invite({ email: 'user@example.invalid' });
  assert.equal(result.invitation.sent, false);
  assert.equal((await users.resendInvite(result.user.id)).invitation.sent, true);
  assert.deepEqual(calls[1], { path: 'admin/users/resend-invite', body: { id: 2, webAppId } });
});

test('unavailable server and invalid responses never report a sent invitation', async () => {
  let unavailable = true;
  const users = createUsersClient({ resolveAppIdentity: async () => ({ webAppId }), request: async () => {
    if (unavailable) throw new Error('This feature is not available on this server.');
    return { id: 2 };
  } });
  await assert.rejects(users.invite({ email: 'user@example.invalid' }), /not available/);
  unavailable = false;
  await assert.rejects(users.invite({ email: 'user@example.invalid' }), /Unable to verify/);
  await assert.rejects(users.invitationApp(), /invalid invitation destination/);
});
