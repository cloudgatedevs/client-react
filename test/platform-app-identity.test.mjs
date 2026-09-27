import assert from 'node:assert/strict';
import test from 'node:test';
import { createAppIdentityResolver } from '../src/platform/identity.js';
import { createAppearanceClient } from '../src/platform/appearance.js';
import { createPaymentsClient } from '../src/platform/payments.js';
import { createAppAnalyticsClient } from '../src/platform/analytics.js';

const webAppId = '12345678-1234-1234-1234-123456789abc';
test('published identity overrides stale build values for appearance and Wallet without a controller', async () => {
  const resolveAppIdentity = createAppIdentityResolver({ webAppId: 'stale', environment: 'sbx',
    resolvePublishedApp: async () => ({ webAppId, isProduction: true, token: 'never-send-this' }) });
  const calls = [];
  const appearance = createAppearanceClient({ resolveAppIdentity, request: async (url, { body }) => {
    calls.push(body); return { values: {}, revision: webAppId };
  } });
  await appearance.get();
  const payments = createPaymentsClient({ resolveAppIdentity, request: async (url, { body }) => {
    calls.push(body); return { ready: false, chargesEnabled: false, payoutsEnabled: false, production: true };
  } });
  await payments.status();
  assert.deepEqual(calls, [{ webAppId, environment: 'prod' }, { environment: 'prod' }]);
});

test('local development uses an explicit web app ID and environment', async () => {
  const resolve = createAppIdentityResolver({ webAppId, environment: 'PROD' });
  assert.deepEqual(await resolve(), { webAppId, environment: 'prod' });
});

test('analytics can use published site identity without any controller path', async () => {
  let payload;
  const api = createAppAnalyticsClient({ apiUrl: 'https://example.invalid', auth: { tenancyName: 'tenant', authHeader: () => ({ Authorization: 'Bearer test' }) },
    resolvePublishedApp: async () => ({ webAppId, isProduction: true }),
    fetchImpl: async (_, init) => { payload = JSON.parse(init.body); return { ok: true, json: async () => ({}) }; } });
  await api.overview();
  assert.equal(payload.publishedWebAppId, webAppId);
  assert.equal(payload.environment, 'prod');
  assert.equal(payload.projectPath, '');
});
