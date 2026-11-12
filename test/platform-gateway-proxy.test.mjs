import test from 'node:test';
import assert from 'node:assert/strict';
import { createCloudgatePlatform, createGatewayProxyResolver } from '../src/platform/index.js';

const appId = '12345678-1234-4234-8234-123456789abc';
const publishedId = 'abcdefab-1234-4234-8234-123456789abc';
const auth = {
  tenancyName: 'rainfin', ensureAccessToken: async () => {},
  authHeader: () => ({ Authorization: 'Bearer user-token' }),
};
const make = options => createCloudgatePlatform({ auth, tenancyName: 'rainfin', webAppId: appId,
  apiUrl: 'https://idp.test', gatewayUrl: 'https://rainfin.api.test/sbx', environment: 'sbx',
  resolvePublishedApp: async () => null, ...options });

test('platform derives the proxy using published app identity, keeps auth direct and sends only the user bearer', async () => {
  const calls = [];
  const client = make({ apiKey: 'legacy-key', apiSecret: 'legacy-secret',
    resolvePublishedApp: async () => ({ webAppId: publishedId, isProduction: true }),
    fetch: async (url, options) => {
      calls.push({ url: String(url), headers: new Headers(options.headers) });
      return Response.json(String(url).includes('/website?') ? { gatewayProxy: { enabled: true } } : { ok: true });
    } });
  await Promise.all([client.gateway.get('/account/balance'), client.gateway.post('/account/profile', { name: 'Test' })]);
  assert.equal(calls.length, 3);
  assert.equal(calls[0].url, `https://idp.test/api/idp/rainfin/website?webAppId=${publishedId}&environment=prod`);
  assert.equal(calls[0].headers.has('Authorization'), false);
  for (const call of calls.slice(1)) {
    assert.ok(call.url.startsWith(`https://rainfin.api.test/api/app-proxy/rainfin/${publishedId}/prod/account/`));
    assert.equal(call.headers.get('Authorization'), 'Bearer user-token');
    assert.equal(call.headers.has('X-Api-Key'), false);
    assert.equal(call.headers.has('X-Authentication-Signature'), false);
  }
  assert.equal(client.config.apiUrl, 'https://idp.test');
});

test('disabled proxy and older servers retain the direct workflow URL', async () => {
  for (const settings of [{ gatewayProxy: { enabled: false } }, {}]) {
    const calls = [];
    const client = make({ fetch: async url => {
      calls.push(String(url));
      return Response.json(String(url).includes('/website?') ? settings : { ok: true });
    } });
    await client.gateway.get('/account/balance');
    assert.equal(calls.at(-1), 'https://rainfin.api.test/sbx/account/balance');
  }
});

test('failed settings discovery sends no workflow request and a subsequent call retries discovery', async () => {
  const calls = [];
  let unavailable = true;
  const client = make({ fetch: async url => {
    calls.push(String(url));
    if (String(url).includes('/website?')) return unavailable
      ? Response.json({ message: 'Unavailable' }, { status: 503 })
      : Response.json({ gatewayProxy: { enabled: true } });
    return Response.json({ ok: true });
  } });
  await assert.rejects(client.gateway.get('/account/balance'));
  assert.equal(calls.length, 1);
  unavailable = false;
  await client.gateway.get('/account/balance');
  assert.equal(calls.length, 3);
  assert.ok(calls[2].includes('/api/app-proxy/'));
});

test('cached proxy settings stay separate for each app and environment', async () => {
  const calls = [];
  const resolve = createGatewayProxyResolver({ gatewayUrl: 'https://gw.test', tenancyName: 'rainfin',
    publicRequest: async path => { calls.push(path); return { gatewayProxy: { enabled: !path.includes('environment=prod') } }; } });
  assert.equal((await resolve({ webAppId: appId, environment: 'sbx' })).proxyEnabled, true);
  assert.equal((await resolve({ webAppId: appId, environment: 'production' })).proxyEnabled, false);
  assert.equal((await resolve({ webAppId: publishedId, environment: 'sbx' })).gatewayUrl, `https://gw.test/api/app-proxy/rainfin/${publishedId}`);
  await resolve({ webAppId: appId, environment: 'sbx' });
  assert.equal(calls.length, 3);
});

test('invalid proxy switches fail closed and explicit proxy URLs never sign in the browser', async () => {
  for (const settings of [null, [], { gatewayProxy: null }, { gatewayProxy: { enabled: 'true' } }]) {
    const resolve = createGatewayProxyResolver({ gatewayUrl: 'https://gw.test', tenancyName: 'rainfin', publicRequest: async () => settings });
    await assert.rejects(resolve({ webAppId: appId, environment: 'sbx' }), /invalid app proxy settings/);
  }
  const base = `https://gw.test/api/app-proxy/rainfin/${appId}`;
  let calls = 0;
  const client = make({ gatewayUrl: base, apiKey: 'legacy-key', apiSecret: 'legacy-secret', fetch: async (url, options) => {
    calls++;
    assert.equal(String(url), `${base}/sbx/account/balance`);
    assert.equal(new Headers(options.headers).has('X-Api-Key'), false);
    return Response.json({ ok: true });
  } });
  await client.gateway.get('/account/balance');
  assert.equal(calls, 1);
});
