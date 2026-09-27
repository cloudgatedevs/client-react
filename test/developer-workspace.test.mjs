import test from 'node:test';
import assert from 'node:assert/strict';
import { createDeveloperWorkspaceClient, isDeveloperWorkspaceMessage } from '../src/platform/developer-workspace.js';
import { createIdpClient } from '../src/platform/transport.js';

test('Developer launch uses IdP bearer and resolved application scope, not a caller-supplied ABP identity', async () => {
  let sent;
  const request = createIdpClient({ apiUrl: 'https://api.test', auth: { tenancyName: 'tenant', authHeader: () => ({ Authorization: 'Bearer idp' }) },
    fetchImpl: async (url, init) => { sent = { url, ...init }; return Response.json({ frameUrl: 'https://hub.test/developer#code=one-use', projectName: 'tenant', appName: 'App', environment: 'prod' }); } });
  const api = createDeveloperWorkspaceClient({ request, resolveAppIdentity: async () => ({ webAppId: 'app-id', environment: 'production' }) });
  const result = await api.open({ returnUrl: 'https://app.test/profile#private', hubUserId: 999, tenantId: 999 });
  assert.equal(sent.url, 'https://api.test/api/idp/tenant/developer-workspace');
  assert.equal(sent.headers.Authorization, 'Bearer idp'); assert.equal(sent.credentials, 'omit');
  assert.deepEqual(JSON.parse(sent.body), { webAppId: 'app-id', environment: 'prod', returnUrl: 'https://app.test/profile' });
  assert.equal(result.frameOrigin, 'https://hub.test'); assert.equal(result.accessToken, undefined);
});

test('Untrusted or non-developer frame URLs are rejected', async () => {
  for (const frameUrl of ['javascript:alert(1)', 'https://hub.test/auth/login', 'https://user:pass@hub.test/developer', 'http://hub.test/developer']) {
    const api = createDeveloperWorkspaceClient({ request: async () => ({ frameUrl }), resolveAppIdentity: async () => ({}) });
    await assert.rejects(api.open({ returnUrl: 'https://app.test/' }));
  }
});

test('Explicit controller focus is sent and must be confirmed by the server', async () => {
  let sent;
  let result = { frameUrl: 'https://hub.test/developer', controllerId: 'controller-id', controllerPath: 'orders' };
  const api = createDeveloperWorkspaceClient({ projectPath: ' /Orders/ ', resolveAppIdentity: async () => ({ webAppId: 'app' }),
    request: async (_path, options) => { sent = options.body; return result; } });
  assert.equal((await api.open({ returnUrl: 'https://app.test' })).controllerId, 'controller-id');
  assert.equal(sent.projectPath, 'Orders');
  for (const scope of [{}, { controllerId: 'other', controllerPath: 'admin' }]) {
    result = { frameUrl: 'https://hub.test/developer', ...scope };
    await assert.rejects(api.open({ returnUrl: 'https://app.test' }), /did not apply.*focus/);
  }
  const invalid = createDeveloperWorkspaceClient({ projectPath: '/', request: () => assert.fail('Must not launch'), resolveAppIdentity: () => assert.fail('Must not resolve') });
  await assert.rejects(invalid.open({ returnUrl: 'https://app.test' }), /path is invalid/);
});

test('Frame messages require the exact origin and Window object', () => {
  const frame = {}, other = {};
  const event = { origin: 'https://hub.test', source: frame, data: { source: 'cloudgate-developer', type: 'ready' } };
  assert.equal(isDeveloperWorkspaceMessage(event, frame, 'https://hub.test'), true);
  assert.equal(isDeveloperWorkspaceMessage({ ...event, source: other }, frame, 'https://hub.test'), false);
  assert.equal(isDeveloperWorkspaceMessage({ ...event, origin: 'https://evil.test' }, frame, 'https://hub.test'), false);
  assert.equal(isDeveloperWorkspaceMessage({ ...event, data: { ...event.data, type: 'set-token' } }, frame, 'https://hub.test'), false);
});
