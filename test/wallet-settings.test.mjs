import test from 'node:test';
import assert from 'node:assert/strict';
import { createUserWalletClient } from '../src/platform/wallet.js';
import { readWalletSettings } from '../src/platform/wallet-settings.js';

test('wallet settings write only supported fields to the resolved environment', async () => {
  const calls = [];
  const client = createUserWalletClient({ environment: 'production', request: async (path, options) => {
    calls.push({ path, ...options }); return { enabled: true, countryCode: 'ZA', production: true };
  } });
  await client.updateSettings({ enabled: true, countryCode: 'za', tenantId: 123, userId: 456 });
  assert.deepEqual(calls, [{ path: 'admin/wallet-settings/update', body: { environment: 'production', enabled: true, countryCode: 'ZA' } }]);
});

test('invalid country, missing enable flag and wrong-environment responses are rejected', async () => {
  let calls = 0;
  const client = createUserWalletClient({ request: async () => { calls++; return { enabled: true, countryCode: 'ZA', production: true }; } });
  for (const input of [{ enabled: true, countryCode: '' }, { enabled: true, countryCode: 'USA' }, { countryCode: 'ZA' }])
    await assert.rejects(() => client.updateSettings(input), /configured country/);
  assert.equal(calls, 0);
  await assert.rejects(() => client.settings(), /could not be verified/);
});

test('missing or unsupported settings fail closed', () => {
  assert.equal(readWalletSettings(undefined, 'sbx').enabled, false);
  assert.equal(readWalletSettings({ enabled: true, countryCode: 'US', production: false }, 'sbx').enabled, false);
  assert.throws(() => readWalletSettings({ enabled: 'true', countryCode: 'ZA', production: false }, 'sbx'), /verified/);
});

test('production rollout preserves the project preference while exposing coming soon', () => {
  const value = readWalletSettings({ enabled: false, configuredEnabled: true, platformEnabled: false,
    countryCode: 'ZA', production: true, availableCountries: ['ZA'], comingSoon: true,
    availabilityMessage: 'Coming soon.' }, 'prod');
  assert.equal(value.enabled, false);
  assert.equal(value.configuredEnabled, true);
  assert.equal(value.comingSoon, true);
});

test('country availability comes from the platform configuration', () => {
  assert.equal(readWalletSettings({ enabled: true, countryCode: 'GB', production: false,
    availableCountries: ['GB', 'IE'] }, 'sbx').enabled, true);
});
