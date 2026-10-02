import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCloudgateAuth, createCloudgatePlatform, createGatewayClient } from '../src/index.js';
const jwt = (sub = '1', seconds = 3600) => `e30.${Buffer.from(JSON.stringify({ sub, exp: Math.floor(Date.now() / 1000) + seconds })).toString('base64url')}.sig`;
const storage = () => { const map = new Map(); return { getItem: k => map.get(k) ?? null, setItem: (k, v) => map.set(k, v), removeItem: k => map.delete(k) }; };

test('gateway calls refresh an expired bearer before sending and use the app environment', async () => {
  const fresh = jwt('2'); const urls = [];
  const auth = createCloudgateAuth({ idpBaseUrl: 'https://hub.test', idpApiUrl: 'https://api.test', tenancyName: 'qa', storage: storage(),
    fetch: async () => Response.json({ accessToken: fresh, refreshToken: 'rotated' }) });
  auth.setSession({ accessToken: jwt('1', 5), refreshToken: 'initial' });
  const gateway = createGatewayClient({ auth, gatewayUrl: 'https://gw.test/sbx/', resolveAppIdentity: async () => ({ environment: 'production' }),
    fetchImpl: async (url, options) => { urls.push(url); assert.equal(options.headers.Authorization, `Bearer ${fresh}`); return Response.json({ ok: true }); } });
  assert.deepEqual(await gateway.get('admin-reads/blockchains', { params: { take: 5 } }), { ok: true });
  assert.deepEqual(urls, ['https://gw.test/prod/admin-reads/blockchains?take=5']);
});

test('a gateway 401 rotates the token once and retries; parallel calls share the refresh', async () => {
  const old = jwt(), fresh = jwt('2'); let refreshes = 0, calls = 0;
  const auth = createCloudgateAuth({ idpBaseUrl: 'https://hub.test', idpApiUrl: 'https://api.test', tenancyName: 'qa', storage: storage(),
    fetch: async () => { refreshes++; return Response.json({ accessToken: fresh, refreshToken: 'rotated' }); } });
  auth.setSession({ accessToken: old, refreshToken: 'initial' });
  const gateway = createGatewayClient({ auth, gatewayUrl: 'https://gw.test', fetchImpl: async (_url, options) => {
    calls++; return options.headers.Authorization === `Bearer ${fresh}` ? Response.json({ ok: true }) : Response.json({}, { status: 401 });
  } });
  const results = await Promise.all(Array.from({ length: 8 }, () => gateway.post('admin/write', { a: 1 })));
  assert.ok(results.every(result => result.ok)); assert.equal(refreshes, 1); assert.equal(calls, 16);
});

test('a 401 that survives a successful refresh is the workflow refusing the call, not the end of the session', async () => {
  let verified = 0;
  const auth = createCloudgateAuth({ idpBaseUrl: 'https://hub.test', idpApiUrl: 'https://api.test', tenancyName: 'qa', storage: storage(),
    fetch: async () => Response.json({ accessToken: jwt('2'), refreshToken: 'rotated' }) });
  auth.setSession({ accessToken: jwt(), refreshToken: 'initial' });
  const gateway = createGatewayClient({ auth, gatewayUrl: 'https://gw.test', verifySession: async () => { verified++; return true; },
    fetchImpl: async () => Response.json({ Message: 'Upstream refused' }, { status: 401 }) });
  await assert.rejects(gateway.get('admin-reads/blockchains'), error => error.status === 401);
  assert.ok(auth.isAuthenticated()); assert.equal(verified, 0);
});

test('when the token cannot be refreshed and has expired the session ends', async () => {
  const auth = createCloudgateAuth({ idpBaseUrl: 'https://hub.test', idpApiUrl: 'https://api.test', tenancyName: 'qa', storage: storage(),
    fetch: async () => Response.json({}, { status: 401 }) });
  auth.setSession({ accessToken: jwt('1', 1), refreshToken: 'dead' });
  let ended = 0; auth.subscribe(session => { if (!session) ended++; });
  await new Promise(resolve => setTimeout(resolve, 1100));
  const gateway = createGatewayClient({ auth, gatewayUrl: 'https://gw.test', fetchImpl: async (_url, options) =>
    options.headers.Authorization ? Response.json({}, { status: 401 }) : Response.json({}, { status: 401 }) });
  await assert.rejects(gateway.get('admin-reads/blockchains'));
  assert.equal(auth.isAuthenticated(), false);
});

test('a refused bearer that still looks valid is checked with the IdP, which ends the session when it refuses it too', async () => {
  const store = storage();
  const platform = createCloudgatePlatform({ idpBaseUrl: 'https://hub.test', apiUrl: 'https://api.test', tenancyName: 'qa', gatewayUrl: 'https://gw.test', storage: store,
    resolvePublishedApp: async () => null, fetch: async () => Response.json({}, { status: 401 }) });
  platform.auth.setSession({ accessToken: jwt(), refreshToken: 'revoked' });
  await assert.rejects(platform.gateway.get('admin-reads/blockchains'), error => error.status === 401);
  assert.equal(platform.auth.isAuthenticated(), false); assert.equal(store.getItem('idp_refresh_token'), null);
});
