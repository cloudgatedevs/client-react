import test from 'node:test';
import assert from 'node:assert/strict';
import { IDP_ACCESS_TOKEN_KEY, IDP_REFRESH_TOKEN_KEY } from '../src/index.js';
import { consumeLauncherLogin } from '../src/platform/launcher.js';

function fixture() {
  const data = new Map(), calls = [], events = [];
  const token = `${Buffer.from('{}').toString('base64url')}.${Buffer.from(JSON.stringify({ sub: '91', tenantid: '42', role: 'Admin', exp: Math.floor(Date.now() / 1000) + 300 })).toString('base64url')}.signature`;
  const options = {
    apiUrl: 'https://api.example', tenancyName: 'tenant', webAppId: 'app',
    location: { pathname: '/', search: '?access_token=old&idp_tenant=attacker&keep=1', hash: '#cloudgate_login=' + 'a'.repeat(43) },
    history: { state: null, replaceState: (...args) => { calls.push(args); events.push('clean'); } },
    storage: { setItem: (k, v) => data.set(k, v) }, auth: { logout: () => { data.clear(); events.push('logout'); } },
    fetcher: async (url, init) => { calls.push({ url, init }); events.push('redeem'); return { ok: true, json: async () => ({ result: { accessToken: token, refreshToken: 'idp-refresh', expiresIn: 300 } }) }; },
  };
  return { options, data, calls, events, token };
}

test('launcher callback removes the code and query overrides before redeeming only against the configured API', async () => {
  const f = fixture();
  assert.equal(await consumeLauncherLogin(f.options), true);
  assert.deepEqual(f.events, ['clean', 'logout', 'redeem']);
  assert.equal(f.calls[0][2], '/?keep=1');
  const call = f.calls[1];
  assert.equal(call.url, 'https://api.example/api/idp/tenant/RedeemLauncherLogin');
  assert.deepEqual(JSON.parse(call.init.body), { code: 'a'.repeat(43), webAppId: 'app' });
  assert.equal(call.init.credentials, 'omit'); assert.equal(call.init.redirect, 'error');
  assert.equal(call.init.headers.Authorization, undefined);
  assert.equal(f.data.get(IDP_ACCESS_TOKEN_KEY), f.token); assert.equal(f.data.get(IDP_REFRESH_TOKEN_KEY), 'idp-refresh');
});

test('expired or rejected codes never leave another users session in place', async () => {
  const f = fixture(); f.data.set(IDP_ACCESS_TOKEN_KEY, 'old-session');
  f.options.fetcher = async () => ({ ok: false, json: async () => ({}) });
  await assert.rejects(consumeLauncherLogin(f.options), /expired/);
  assert.equal(f.data.size, 0); assert.equal(f.calls[0][2], '/?keep=1');
});

test('ordinary visits leave existing login behavior unchanged', async () => {
  const f = fixture(); f.options.location.hash = '#notifications';
  assert.equal(await consumeLauncherLogin(f.options), false);
  assert.deepEqual(f.calls, []); assert.deepEqual(f.events, []);
});

test('missing app configuration removes the code but never sends it to an arbitrary server', async () => {
  const f = fixture(); f.options.webAppId = '';
  await assert.rejects(consumeLauncherLogin(f.options), /invalid/);
  assert.deepEqual(f.events, ['clean', 'logout']);
});
