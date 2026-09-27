import test from 'node:test';
import assert from 'node:assert/strict';
import { createIdpAdminClient } from '../src/platform/transport.js';
import { DEFAULT_SETTINGS, normalizeSettings, validateSettings, foreground, accentText } from '../src/platform/appearance-model.js';
import { isAdminRole } from '../src/platform/roles.js';

function fixture(respond) {
  const calls = [];
  let token = 'old', refreshes = 0;
  const auth = { tenancyName: 'test tenant', getAccessToken: () => token, authHeader: () => ({ Authorization: `Bearer ${token}` }), refresh: async () => { token = 'new'; refreshes++; return true; } };
  const request = createIdpAdminClient({ auth, apiUrl: 'https://api.example.invalid/', fetchImpl: async (url, init) => { calls.push({ url, ...init }); return respond?.(calls.length) ?? Response.json({ result: { id: 2 } }); } });
  return { auth, request, calls, refreshes: () => refreshes };
}
test('user requests encode tenant and refresh once with the current bearer', async () => {
  const f = fixture(i => i === 1 ? Response.json({}, { status: 401 }) : Response.json({ result: { id: 2 } }));
  assert.deepEqual(await f.request('admin/users/update', { body: { id: 2, email: 'a@example.com' } }), { id: 2 });
  assert.equal(f.calls[0].url, 'https://api.example.invalid/api/idp/test%20tenant/admin/users/update');
  assert.equal(f.calls[1].headers.Authorization, 'Bearer new');
  assert.equal(f.refreshes(), 1);
  assert.deepEqual(JSON.parse(f.calls[1].body), { id: 2, email: 'a@example.com' });
});
test('rejected identity and unavailable APIs produce errors, not successful empty results', async () => {
  const denied = fixture(() => Response.json({}, { status: 403 }));
  await assert.rejects(denied.request('admin/users/list'), /does not have access/);
  const missing = fixture(() => Response.json({}, { status: 404 }));
  await assert.rejects(missing.request('admin/users/list'), /not available/);
  const missingScope = fixture(() => Response.json({ result: { message: 'No application uses that controller path in this environment.' }, success: true }, { status: 404 }));
  await assert.rejects(missingScope.request('admin/payments/status'), /No application uses that controller/);
  const failed = fixture(() => Response.json({ success: false, error: { message: 'Protected account' } }));
  await assert.rejects(failed.request('admin/users/delete'), /Protected account/);
  const expired = fixture(() => Response.json({}, { status: 401 }));
  await assert.rejects(expired.request('admin/users/list'), /Sign in/);
  assert.equal(expired.calls.length, 2);
});
test('missing sign-in never makes a user or media request', async () => {
  const f = fixture(); f.auth.getAccessToken = () => null;
  await assert.rejects(f.request('files'), /Sign in/); assert.equal(f.calls.length, 0);
});
test('uploads preserve multipart boundaries and file identity', async () => {
  const f = fixture(); const body = new FormData(); body.append('file', new Blob(['image']), 'image.png');
  await f.request('files/upload?path=admin%2Fmedia', { body });
  assert.equal(f.calls[0].body, body); assert.equal(f.calls[0].headers['Content-Type'], undefined);
});
test('theme defaults and validation reject unsafe or unusable appearance values', () => {
  assert.equal(validateSettings(DEFAULT_SETTINGS), null);
  assert.match(validateSettings({ ...DEFAULT_SETTINGS, theme_primary: '#fff' }), /six-digit/);
  assert.match(validateSettings({ ...DEFAULT_SETTINGS, app_logo_url: 'javascript:alert(1)' }), /URLs/);
  assert.match(validateSettings({ ...DEFAULT_SETTINGS, app_name: ' ' }), /name/);
  const normalized = normalizeSettings({ theme_mode: 'invalid', theme_primary: 'bad', app_icon_url: 'data:text/html,bad' });
  assert.equal(normalized.theme_mode, 'light'); assert.equal(normalized.theme_primary, DEFAULT_SETTINGS.theme_primary); assert.equal(normalized.app_icon_url, '');
  assert.equal(foreground('#ffffff'), '15 23 42'); assert.equal(foreground('#000000'), '255 255 255');
  assert.notEqual(accentText('#ffffff', false), '255 255 255');
  assert.notEqual(accentText('#000000', true), '0 0 0');
});
test('back office roles fail closed for missing roles and members', () => {
  for (const role of [undefined, null, '', 'member', 'Admin,member']) assert.equal(isAdminRole(role), false);
  for (const role of ['Admin', 'admin', 'ADMIN']) assert.equal(isAdminRole(role), true);
  for (const role of ['administrator', 'owner']) assert.equal(isAdminRole(role), false);
});
