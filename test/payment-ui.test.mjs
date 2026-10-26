import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { JSDOM } from 'jsdom';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost:3001/backoffice/cloudgate/payments/test' });
for (const key of ['window', 'document', 'HTMLElement', 'HTMLInputElement', 'Element', 'Node', 'NodeFilter', 'MutationObserver', 'CustomEvent', 'HTMLFormElement'])
  globalThis[key] = key === 'window' ? dom.window : key === 'document' ? dom.window.document : dom.window[key];
globalThis.location = window.location;
globalThis.getComputedStyle = window.getComputedStyle.bind(window);
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const require = createRequire(import.meta.url);
const { createRoot } = require('react-dom/client');
const { MemoryRouter } = require('react-router-dom');
const compiled = await build({ stdin: { contents: `
  export { TestPayment } from './src/react/pages/TestPayment.jsx';
  export { CloudgateProvider } from './src/react/context.jsx';
  export { AuthContext } from './src/react/auth/AuthProvider.jsx';
`, resolveDir: fileURLToPath(new URL('..', import.meta.url)), loader: 'jsx' },
  bundle: true, write: false, format: 'cjs', platform: 'node', packages: 'external', jsx: 'automatic', loader: { '.svg': 'dataurl', '.css': 'empty' }, logLevel: 'silent' });
const module = { exports: {} };
new Function('require', 'module', 'exports', compiled.outputFiles[0].text)(require, module, module.exports);
const { TestPayment, CloudgateProvider, AuthContext } = module.exports;
const h = React.createElement, { act } = React;
const invoice = { id: 24, invoiceId: 'invoice-24', invoiceNumber: 'INV-000024', isProduction: false,
  receivingAccountNumber: '0123456789012345', grossAmount: 100, currency: 'zar', description: 'Test payment', status: 0,
  creationTime: '2026-10-12T08:00:00Z', paymentUrl: 'http://localhost:5173/pay/openpay/sandbox/invoice-24' };

async function mount(t, { createTest = async () => invoice, get = async () => invoice, canCreate = true } = {}) {
  const client = { config: { apiUrl: 'http://localhost', environment: 'sbx' }, auth: { tenancyName: 'app' }, resolveAppIdentity: async () => ({ environment: 'sbx' }), payments: { createTest, get, status: async () => ({ ready: true, production: false, currency: 'zar', payoutsEnabled: false,
    wallet: { accountNumber: '9876543210987654', phoneNumber: '+27820000000', firstName: 'Test', lastName: 'Holder', email: 'holder@example.invalid', walletType: 'Personal', network: 'XCAP Voucher' } }) } };
  const host = document.createElement('div'); document.body.append(host);
  const root = createRoot(host);
  t.after(async () => { await act(async () => root.unmount()); host.remove(); });
  const rolePermissions = ['backoffice.access', 'backoffice.payments.test.view', 'backoffice.payments.history', ...(canCreate ? ['backoffice.payments.test.create'] : [])].map(key => ({ key, value: true }));
  await act(async () => root.render(h(MemoryRouter, null, h(CloudgateProvider, { client },
    h(AuthContext.Provider, { value: { currentUser: { user: { id: 1, rolePermissions } } } }, h(TestPayment))))));
  return host;
}
const button = text => [...document.querySelectorAll('button')].find(node => node.textContent.trim() === text);
const submit = () => act(async () => document.querySelector('form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true })));

test('test checkout displays live wallet details, opens the original invoice and refreshes it in its environment', async t => {
  const reads = [];
  await mount(t, { get: async request => { reads.push(request); return { ...invoice, status: 1 }; } });
  assert.match(document.body.textContent, /9876 5432 1098 7654/);
  assert.match(document.body.textContent, /Individual \/ sole proprietor/);
  assert.match(document.body.textContent, /holder@example.invalid/);
  await submit();
  await act(async () => button('INV-000024').click());
  const dialog = document.querySelector('[role="dialog"]');
  assert.ok(dialog);
  assert.match(dialog.textContent, /0123 4567 8901 2345/);
  assert.doesNotMatch(dialog.textContent, /9876 5432/);
  const checkout = dialog.querySelector('a');
  assert.equal(checkout.href, invoice.paymentUrl);
  assert.equal(checkout.target, '_blank');
  assert.match(checkout.rel, /noopener/);
  await act(async () => button('Refresh status').click());
  assert.deepEqual(reads, [{ paymentId: 24, environment: 'sbx' }]);
  assert.match(dialog.textContent, /Succeeded/);
  await act(async () => [...dialog.querySelectorAll('button')].find(node => node.textContent === 'Close').click());
  assert.equal(document.querySelector('[role="dialog"]'), null);
});

test('a failed checkout retry reuses its idempotency key and an explicit new test gets a fresh key', async t => {
  const calls = [];
  await mount(t, { createTest: async input => { calls.push(input); if (calls.length === 1) throw new Error('Temporary failure'); return invoice; } });
  await submit();
  assert.match(document.body.textContent, /Temporary failure/);
  await submit();
  assert.equal(calls[0].idempotencyKey, calls[1].idempotencyKey);
  assert.equal(calls[1].amount, 100);
  assert.equal(calls[1].currency, 'ZAR');
  await act(async () => button('Create another test').click());
  await submit();
  assert.notEqual(calls[2].idempotencyKey, calls[1].idempotencyKey);
});

test('test view permission alone cannot enable the create checkout form', async t => {
  await mount(t, { canCreate: false });
  assert.equal(document.querySelector('fieldset').disabled, true);
});
