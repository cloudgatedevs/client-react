import assert from 'node:assert/strict';
import test from 'node:test';
import { createAppearanceClient, createCloudgatePlatform, createIdpClient } from '../src/platform/index.js';
import { normalizeBackofficeBasePath, scopedBackofficePath, scopeNavigation } from '../src/react/routing.js';

const id = '12345678-1234-1234-1234-123456789abc';
test('public website bootstrap is tenant scoped and sends neither bearer tokens nor cookies', async () => {
  const forbidden = () => assert.fail('Anonymous requests must not read or refresh the session');
  let calls = 0;
  const request = createIdpClient({ apiUrl: 'https://api.example.invalid', anonymous: true,
    auth: { tenancyName: 'my tenant', ensureAccessToken: forbidden, authHeader: forbidden, refresh: forbidden },
    fetchImpl: async (url, options) => {
      calls++;
      assert.equal(url, 'https://api.example.invalid/api/idp/my%20tenant/website');
      assert.equal(options.headers.Authorization, undefined);
      assert.equal(options.credentials, 'omit'); assert.equal(options.cache, 'no-store');
      return Response.json({}, { status: 401 });
    } });
  await assert.rejects(request('website', { method: 'GET' }), error => error.status === 401);
  assert.equal(calls, 1);
});

test('public settings use the current app and environment and do not fall back on an invalid policy', async () => {
  let response = { values: { enable_public_website: 'false', app_name: 'Atlas' }, revision: id, allowSelfRegistration: true };
  const client = createAppearanceClient({ webAppId: id, environment: 'production',
    request: () => assert.fail('No authenticated admin request'),
    publicRequest: async (path, options) => {
      assert.equal(path, `website?webAppId=${id}&environment=production`);
      assert.equal(options.method, 'GET'); return response;
    } });
  const loaded = await client.getPublic();
  assert.equal(loaded.values.enable_public_website, 'false'); assert.equal(loaded.allowSelfRegistration, true);
  assert.equal(loaded.values.require_public_website_login, 'false', 'Older servers and existing sites keep anonymous access');
  response = { ...response, values: { ...response.values, require_public_website_login: 'true' } };
  assert.equal((await client.getPublic()).values.require_public_website_login, 'true');
  for (const invalid of [null, {}, { ...response, allowSelfRegistration: 'true' },
    ...[true, null, '', 'yes'].map(value => ({ ...response, values: { ...response.values, require_public_website_login: value } })),
    { ...response, values: { enable_public_website: true } }, { ...response, revision: 'invalid' }]) {
    response = invalid;
    await assert.rejects(client.getPublic(), /website settings could not be loaded/);
  }
  await assert.rejects(createAppearanceClient({ webAppId: '', publicRequest: () => assert.fail() }).getPublic(), /web app ID/);
});

test('back office paths and nested navigation stay under the selected mount without double prefixes', () => {
  const base = normalizeBackofficeBasePath('/backoffice/');
  assert.equal(scopedBackofficePath(base, '/'), '/backoffice');
  assert.equal(scopedBackofficePath(base, '/backoffice/users'), '/backoffice/users');
  assert.equal(scopedBackofficePath(base, '/payments/test?payment=1'), '/backoffice/payments/test?payment=1');
  const original = [{ to: '/' }, { children: [{ to: '/users' }] }];
  assert.deepEqual(scopeNavigation(original, base), [{ to: '/backoffice', end: true }, { children: [{ to: '/backoffice/users' }] }]);
  assert.equal(original[1].children[0].to, '/users');
  assert.equal(scopedBackofficePath('', '/users'), '/users');
  for (const invalid of ['relative', '//host', '/a/../b', '/backoffice?x=1']) assert.throws(() => normalizeBackofficeBasePath(invalid));
});

test('public sign-up stays in the configured tenant and returns to the requesting app', () => {
  const client = createCloudgatePlatform({ idpBaseUrl: 'https://hub.example.invalid', tenancyName: 'my-tenant' });
  const url = new URL(client.signupUrl('https://app.example.invalid/'));
  assert.equal(url.pathname, '/idp/my-tenant/signup');
  assert.equal(url.searchParams.get('returnUrl'), 'https://app.example.invalid/');
});
