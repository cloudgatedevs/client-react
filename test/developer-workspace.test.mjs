import test from 'node:test';
import assert from 'node:assert/strict';
import { createDeveloperWorkspaceClient, handleDeveloperAppRefresh, isDeveloperWorkspaceMessage } from '../src/platform/developer-workspace.js';
import { createIdpClient } from '../src/platform/transport.js';

test('Developer launch uses IdP bearer and resolved application scope, not a caller-supplied ABP identity', async () => {
  let sent;
  const request = createIdpClient({ apiUrl: 'https://api.test', auth: { tenancyName: 'tenant', authHeader: () => ({ Authorization: 'Bearer idp' }) },
    fetchImpl: async (url, init) => { sent = { url, ...init }; return Response.json({ frameUrl: 'https://hub.test/developer#code=one-use', projectName: 'tenant', appName: 'App', environment: 'prod', controllerPath: '*' }); } });
  const api = createDeveloperWorkspaceClient({ request, projectPath: '*', resolveAppIdentity: async () => ({ webAppId: 'app-id', environment: 'production' }) });
  const result = await api.open({ returnUrl: 'https://app.test/profile#private', hubUserId: 999, tenantId: 999 });
  assert.equal(sent.url, 'https://api.test/api/idp/tenant/developer-workspace');
  assert.equal(sent.headers.Authorization, 'Bearer idp'); assert.equal(sent.credentials, 'omit');
  assert.deepEqual(JSON.parse(sent.body), { webAppId: 'app-id', environment: 'prod', returnUrl: 'https://app.test/profile', projectPath: '*' });
  assert.equal(result.frameOrigin, 'https://hub.test'); assert.equal(result.accessToken, undefined);
});

test('Untrusted or non-developer frame URLs are rejected', async () => {
  for (const frameUrl of ['javascript:alert(1)', 'https://hub.test/auth/login', 'https://user:pass@hub.test/developer', 'http://hub.test/developer']) {
    const api = createDeveloperWorkspaceClient({ projectPath: '*', request: async () => ({ frameUrl, controllerPath: '*' }), resolveAppIdentity: async () => ({}) });
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
  await assert.rejects(invalid.open({ returnUrl: 'https://app.test' }), error => /VITE_CLOUDGATE_API_PROJECT/.test(error.message) && error.code === 'developer-controller-required');
});

test('Empty configuration opens all accessible controllers, which the server must confirm', async () => {
  for (const projectPath of [undefined, '', ' ']) {
    let sent;
    const api = createDeveloperWorkspaceClient({ projectPath, resolveAppIdentity: async () => ({ webAppId: 'app' }),
      request: async (_path, options) => { sent = options.body; return { frameUrl: 'https://hub.test/developer', controllerPath: '*' }; } });
    assert.equal((await api.open({ returnUrl: 'https://app.test' })).controllerPath, '*'); assert.equal(sent.projectPath, '*');
  }
});

test('Invalid configuration never launches and a wildcard must be confirmed', async () => {
  for (const projectPath of ['/', '*/orders', 'orders/*']) {
    const api = createDeveloperWorkspaceClient({ projectPath, request: () => assert.fail('Must not launch'), resolveAppIdentity: () => assert.fail('Must not resolve') });
    await assert.rejects(api.open({ returnUrl: 'https://app.test' }));
  }
  for (const result of [{}, { controllerId: 'orders', controllerPath: 'orders' }, { controllerId: 'orders', controllerPath: '*' }]) {
    const api = createDeveloperWorkspaceClient({ projectPath: '*', request: async () => ({ frameUrl: 'https://hub.test/developer', ...result }), resolveAppIdentity: async () => ({}) });
    await assert.rejects(api.open({ returnUrl: 'https://app.test' }), /did not apply.*focus/);
  }
});

test('Frame messages require the exact origin and Window object', () => {
  const frame = {}, other = {};
  const event = { origin: 'https://hub.test', source: frame, data: { source: 'cloudgate-developer', type: 'ready' } };
  assert.equal(isDeveloperWorkspaceMessage(event, frame, 'https://hub.test'), true);
  assert.equal(isDeveloperWorkspaceMessage({ ...event, source: other }, frame, 'https://hub.test'), false);
  assert.equal(isDeveloperWorkspaceMessage({ ...event, origin: 'https://evil.test' }, frame, 'https://hub.test'), false);
  assert.equal(isDeveloperWorkspaceMessage({ ...event, data: { ...event.data, type: 'set-token' } }, frame, 'https://hub.test'), false);
  assert.equal(isDeveloperWorkspaceMessage({ ...event, data: { ...event.data, type: 'sdk-update' } }, frame, 'https://hub.test'), true);
});

test('SDK version is carried into the workspace and automatic checks do not launch it', async () => {
  const requests = [];
  const api = createDeveloperWorkspaceClient({ projectPath: '*', resolveAppIdentity: async () => ({ webAppId: 'app', environment: 'sbx' }),
    request: async (path, options) => { requests.push({ path, options }); return { frameUrl: 'https://hub.test/developer', controllerPath: '*', updateAvailable: true }; } });
  await api.open({ returnUrl: 'https://app.test', sdkVersion: '0.1.3', sdkSource: 'local' });
  assert.equal(requests[0].options.body.sdkVersion, '0.1.3'); assert.equal(requests[0].options.body.sdkSource, 'local');
  const result = await api.sdkStatus({ runningVersion: '0.1.2', sdkSource: 'npm' });
  assert.equal(result.updateAvailable, true); assert.equal(requests[1].options.method, 'GET');
  assert.equal(requests[1].path, 'developer-workspace/sdk-status?webAppId=app&runningVersion=0.1.2&sdkSource=npm');
  assert.equal(requests[1].options.body, undefined);
});

test('Release refresh reloads the parent app only for its trusted active developer frame', () => {
  const calls = [], frame = { postMessage: (...args) => calls.push(args) };
  const event = { source: frame, origin: 'https://hub.test', data: { source: 'cloudgate-developer', type: 'refresh-app', requestId: crypto.randomUUID(), url: 'https://untrusted.test' } };
  const reload = () => calls.push('reload-current-route');
  for (const invalid of [{ ...event, source: {} }, { ...event, origin: 'https://untrusted.test' }, { ...event, data: { ...event.data, requestId: '' } },
    { ...event, data: { ...event.data, type: 'ready' } }])
    assert.equal(handleDeveloperAppRefresh(invalid, frame, 'https://hub.test', reload), false);
  assert.deepEqual(calls, []);
  assert.equal(handleDeveloperAppRefresh(event, frame, 'https://hub.test', reload), true);
  assert.deepEqual(calls, [[{ source: 'cloudgate-app', type: 'refresh-app-accepted', requestId: event.data.requestId }, 'https://hub.test'], 'reload-current-route']);
});
