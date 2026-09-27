import test from 'node:test';
import assert from 'node:assert/strict';
import { createAccountSecurityClient, completeTwoFactorLogin } from '../src/platform/account-security.js';
import { consumeLauncherLogin } from '../src/platform/launcher.js';
import { createCloudgateAuth } from '@cloudgatedevs/cloudgate-client';

test('adopting a new security session never emits an intermediate signed-out state', () => {
  const values = new Map(), sessions = [];
  const auth = createCloudgateAuth({ idpBaseUrl: 'https://hub.example', tenancyName: 'qa', storage: {
    getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key),
  } });
  const token = `eyJhbGciOiJub25lIn0.${Buffer.from(JSON.stringify({ sub: '1', exp: Math.floor(Date.now()/1000)+300 })).toString('base64url')}.test`;
  auth.setSession({ accessToken: token, refreshToken: 'old' });
  const stop = auth.subscribe(value => sessions.push(value)); sessions.length = 0;
  auth.setSession({ accessToken: token, refreshToken: 'new' });
  assert.equal(sessions.length, 1); assert.equal(sessions[0].refreshToken, 'new');
  stop();
});

test('security requests use native self-service routes and replace the session only after successful proof', async () => {
  const calls = [], sessions = [], tokens = { accessToken: 'new-session', refreshToken: 'refresh' };
  const security = { email: 'test@example.invalid', isEmailConfirmed: false, twoFactorEnabled: true, recoveryCodesRemaining: 10 };
  const client = createAccountSecurityClient({ auth: { setSession: value => sessions.push(value) }, request: async (path, options) => {
    calls.push({ path, options });
    return path === 'account/security' ? security : path.endsWith('/setup') ? { manualEntryKey: 'JBSWY3DPEHPK3PXP', authenticatorUri: 'otpauth://totp/Cloudgate' }
      : { security, tokens: path.endsWith('/enable') ? tokens : null };
  } });
  const signal = new AbortController().signal;
  await client.get({ signal }); await client.beginSetup(); await client.confirmSetup(' 123456 '); await client.regenerateRecoveryCodes('recovery'); await client.disable('123456');
  assert.deepEqual(calls.map(value => value.path), ['account/security', 'account/security/setup', 'account/security/enable', 'account/security/recovery-codes', 'account/security/disable']);
  assert.equal(calls[0].options.method, 'GET'); assert.equal(calls[0].options.signal, signal);
  assert.deepEqual(calls[2].options.body, { code: '123456' }); assert.deepEqual(sessions, [tokens]);
  const failing = createAccountSecurityClient({ auth: { setSession: () => assert.fail('Must not adopt a session') }, request: async () => { throw new Error('Invalid code'); } });
  await assert.rejects(failing.confirmSetup('wrong'), /Invalid code/);
  const incomplete = createAccountSecurityClient({ auth: {}, request: async () => ({}) });
  await assert.rejects(incomplete.get(), /incomplete account security status/);
  await assert.rejects(incomplete.beginSetup(), /could not start authenticator setup/);
});

test('challenge completion sends only challenge and code, never a bearer or cookies, and rejects failed or incomplete exchanges', async () => {
  const input = { apiUrl: 'https://api.example/', tenancyName: 'a/b', challengeToken: 'protected-ticket', code: '123456' };
  const tokens = { accessToken: 'verified', refreshToken: 'refresh', returnUrl: 'https://app.example/' };
  const result = await completeTwoFactorLogin({ ...input, fetchImpl: async (url, options) => {
    assert.equal(url, 'https://api.example/api/idp/a%2Fb/TwoFactorLogin'); assert.equal(options.credentials, 'omit');
    assert.equal(options.redirect, 'error'); assert.equal(options.headers.Authorization, undefined);
    assert.deepEqual(JSON.parse(options.body), { challengeToken: input.challengeToken, code: input.code });
    return Response.json({ result: tokens });
  } });
  assert.deepEqual(result, tokens);
  await assert.rejects(completeTwoFactorLogin({ ...input, fetchImpl: async () => Response.json({ message: 'Code already used' }, { status: 400 }) }), /Code already used/);
  await assert.rejects(completeTwoFactorLogin({ ...input, fetchImpl: async () => Response.json({ requiresTwoFactor: true }) }), /Could not verify/);
});

test('launcher pauses for the second factor before adopting tokens and fails closed without a handler', async () => {
  const token = `eyJhbGciOiJub25lIn0.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now()/1000)+300, tenantid: 42 })).toString('base64url')}.test`;
  const sessions = [], challenge = { requiresTwoFactor: true, challengeToken: 'protected' };
  const options = { apiUrl: 'https://api.example', tenancyName: 'qa', webAppId: 'app',
    auth: { logout() {}, setSession: value => sessions.push(value) },
    location: { hash: '#cloudgate_login='+'x'.repeat(43), pathname: '/', search: '' }, history: { replaceState() {} },
    fetcher: async () => Response.json(challenge) };
  await assert.rejects(consumeLauncherLogin(options), /Two-factor authentication is required/); assert.deepEqual(sessions, []);
  await consumeLauncherLogin({ ...options, onTwoFactorRequired: async value => { assert.deepEqual(value, challenge); assert.deepEqual(sessions, []); return { accessToken: token, refreshToken: 'refresh' }; } });
  assert.equal(sessions.length, 1);
});
