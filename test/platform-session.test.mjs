import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCloudgateAuth, createCloudgatePlatform, createIdpClient } from '../src/index.js';
const jwt = (sub = '1') => `e30.${Buffer.from(JSON.stringify({ sub, exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.sig`;
const storage = () => { const map = new Map(); return { getItem: k => map.get(k) ?? null, setItem: (k,v) => map.set(k,v), removeItem: k => map.delete(k) }; };
const deferred = () => { let resolve; const promise = new Promise(r => resolve = r); return { promise, resolve }; };

test('parallel native 401s rotate the refresh token once and retry with the new bearer', async () => {
  const store = storage(); const gate = deferred(); let refreshes = 0, calls = 0;
  const old = jwt(), fresh = jwt('2');
  const auth = createCloudgateAuth({ idpBaseUrl: 'https://hub.test', idpApiUrl: 'https://api.test', tenancyName: 'qa', storage: store,
    fetch: async () => { refreshes++; await gate.promise; return Response.json({ accessToken: fresh, refreshToken: 'rotated' }); } });
  auth.setSession({ accessToken: old, refreshToken: 'initial' });
  const request = createIdpClient({ auth, apiUrl: 'https://api.test', fetchImpl: async (_url, options) => {
    calls++; return options.headers.Authorization === `Bearer ${fresh}` ? Response.json({ ok: true }) : Response.json({}, { status: 401 });
  } });
  const requests = Array.from({ length: 20 }, () => request('profile', { method: 'GET' }));
  await new Promise(resolve => setTimeout(resolve, 10)); gate.resolve();
  assert.ok((await Promise.all(requests)).every(result => result.ok));
  assert.equal(refreshes, 1); assert.equal(calls, 40); assert.equal(store.getItem('idp_refresh_token'), 'rotated');
});

test('a refresh completing after logout cannot restore a session', async () => {
  const gate = deferred(); const started = deferred();
  const auth = createCloudgateAuth({ idpBaseUrl: 'https://hub.test', tenancyName: 'qa', storage: storage(), fetch: async () => {
    started.resolve(); await gate.promise; return Response.json({ accessToken: jwt(), refreshToken: 'rotated' });
  } });
  auth.setSession({ accessToken: jwt(), refreshToken: 'initial' });
  const pending = auth.refresh(); await started.promise;
  auth.logout({ redirectToLogin: false }); gate.resolve();
  assert.equal(await pending, null); assert.equal(auth.getAccessToken(), null);
});

test('initialization does not resurrect a cached session on remount after logout', async () => {
  const client = createCloudgatePlatform({ idpBaseUrl: 'https://hub.test', tenancyName: 'qa', storage: storage(), resolvePublishedApp: async () => null });
  client.auth.setSession({ accessToken: jwt() }); assert.ok(await client.initialize());
  client.auth.logout({ redirectToLogin: false }); assert.equal(await client.initialize(), null);
});

test('initialization preserves a fresh session installed by another tab during refresh', async () => {
  const store = storage(), gate = deferred(), started = deferred();
  store.setItem('idp_refresh_token', 'initial');
  const options = { idpBaseUrl: 'https://hub.test', tenancyName: 'qa', storage: store };
  const first = createCloudgateAuth({ ...options, fetch: async () => {
    started.resolve(); await gate.promise; return Response.json({ accessToken: jwt('old'), refreshToken: 'stale' });
  } });
  const pending = first.init(); await started.promise;
  createCloudgateAuth(options).setSession({ accessToken: jwt('new'), refreshToken: 'current' });
  gate.resolve();
  assert.equal((await pending).user.id, 'new');
  assert.equal(store.getItem('idp_refresh_token'), 'current');
});

test('a concurrent refresh can supply a new bearer even when the waiting refresh returns null', async () => {
  let bearer = 'Bearer old', calls = 0;
  const auth = { tenancyName: 'qa', authHeader: () => ({ Authorization: bearer }), refresh: async () => { bearer = 'Bearer new'; return null; } };
  const request = createIdpClient({ auth, apiUrl: 'https://api.test', fetchImpl: async () => ++calls === 1 ? Response.json({}, { status: 401 }) : Response.json({ ok: true }) });
  assert.equal((await request('profile')).ok, true); assert.equal(calls, 2);
});

test('native transport never sends the bearer to an absolute or parent route', async () => {
  let calls = 0;
  const request = createIdpClient({ auth: { tenancyName: 'qa', authHeader: () => ({ Authorization: 'Bearer token' }) }, apiUrl: 'https://api.test', fetchImpl: async () => { calls++; return Response.json({}); } });
  for (const route of ['https://evil.test/', '//evil.test/', '../profile', '%2e%2e/profile', 'admin/../../profile', 'admin\\profile']) await assert.rejects(request(route), { code: 'configuration' });
  assert.equal(calls, 0);
});

test('account link calls share the native bearer transport and never send an ABP credential', async () => {
  const calls = [];
  const client = createCloudgatePlatform({ idpBaseUrl: 'https://hub.test', apiUrl: 'https://api.test', tenancyName: 'qa', storage: storage(),
    fetch: async (url, options) => { calls.push({ url, ...options }); return Response.json({ linked: false, available: false }); } });
  client.auth.setSession({ accessToken: jwt() });
  await client.accountLink.get(); await client.accountLink.start({ returnUrl: 'https://app.test/profile' });
  await client.accountLink.complete({ code: 'opaque' }); await client.accountLink.detach();
  assert.deepEqual(calls.map(c => c.method), ['GET', 'POST', 'POST', 'DELETE']);
  assert.ok(calls.every(c => c.url.startsWith('https://api.test/api/idp/qa/profile/cloudgate-link') && c.credentials === 'omit' && c.redirect === 'error'));
  assert.deepEqual(JSON.parse(calls[2].body), { code: 'opaque' });
});
