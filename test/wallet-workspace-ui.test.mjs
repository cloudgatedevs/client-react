import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { JSDOM } from 'jsdom';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/account/wallet', pretendToBeVisual: true });
for (const key of ['window', 'document', 'HTMLElement', 'HTMLInputElement', 'Element', 'Node', 'NodeFilter', 'MutationObserver', 'CustomEvent', 'HTMLFormElement', 'Event', 'sessionStorage'])
  globalThis[key] = key === 'window' ? dom.window : key === 'document' ? dom.window.document : dom.window[key];
const checkoutNavigations = [];
globalThis.window = new Proxy(dom.window, { get(target, key) {
  if (key === 'location') return { href: target.location.href, assign: url => checkoutNavigations.push({ url, saved: { ...sessionStorage } }) };
  if (['addEventListener', 'removeEventListener', 'dispatchEvent'].includes(key)) return target[key].bind(target);
  return Reflect.get(target, key, target);
} });
globalThis.getComputedStyle = window.getComputedStyle.bind(window); globalThis.IS_REACT_ACT_ENVIRONMENT = true;
globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} }; window.ResizeObserver = globalThis.ResizeObserver;
const require = createRequire(import.meta.url), { createRoot } = require('react-dom/client');
const compiled = await build({ stdin: { contents: `export { WalletWorkspace } from './src/react/components/WalletWorkspace.jsx'; export { CloudgateProvider } from './src/react/context.jsx'; export { AuthContext } from './src/react/auth/AuthProvider.jsx'; export { SettingsContext } from './src/react/settings/SettingsProvider.jsx';`, resolveDir: fileURLToPath(new URL('..', import.meta.url)), loader: 'jsx' }, bundle: true, write: false, format: 'cjs', platform: 'node', packages: 'external', jsx: 'automatic', loader: { '.svg': 'dataurl', '.css': 'empty' }, logLevel: 'silent' });
const module = { exports: {} }; new Function('require', 'module', 'exports', compiled.outputFiles[0].text)(require, module, module.exports);
const { WalletWorkspace, CloudgateProvider, AuthContext, SettingsContext } = module.exports, { act } = React, h = React.createElement;
const account = '3287272359041533', recipient = '9999999999999995', id = '76019e19-7607-46e3-b1b5-1a447d46ffda';
const scope = { production: false, accountNumber: account };
const op = { id, status: 0, kind: 1, amount: 10, fee: 0, recipientAccountNumber: recipient, authorizationDigest: 'a'.repeat(64), expiresAtUtc: new Date(Date.now() + 600000).toISOString() };
const button = text => [...document.querySelectorAll('button')].find(b => b.textContent.trim() === text);
const click = element => act(async () => element.click());
const fill = (label, value) => act(async () => { const input = document.querySelector(`[aria-label="${label}"]`) || document.getElementById([...document.querySelectorAll('label')].find(l => l.textContent === label).htmlFor); Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, value); input.dispatchEvent(new window.Event('input', { bubbles: true })); input.dispatchEvent(new window.Event('change', { bubbles: true })); });
const submit = () => act(async () => document.querySelector('form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true })));
const disconnectConfirm = () => [...document.querySelectorAll('[role="dialog"] button')].find(b => b.textContent.trim() === 'Disconnect wallet');
async function mount(t, overrides = {}, topupDraft = null) {
  sessionStorage.clear();
  checkoutNavigations.length = 0;
  if (topupDraft) sessionStorage.setItem('cg-wallet-topup:http://localhost:app:1:sbx', JSON.stringify(topupDraft));
  const wallet = { get: async () => ({ ...scope, linked: true, phoneNumber: '+27821234567' }), balance: async () => ({ ...scope, available: 89, reserved: 0, pending: 0, restricted: 0 }), holdings: async () => ({ ...scope, totalCount: 1, items: [{ id, status: 'available', amount: 89, createdAtUtc: new Date().toISOString() }] }), transactions: async () => ({ ...scope, totalCount: 0, items: [] }), ...overrides };
  const client = { wallet, config: { apiUrl: 'http://localhost', environment: 'sbx' }, auth: { tenancyName: 'app' }, resolveAppIdentity: async () => ({ environment: 'sbx' }) };
  const host = document.createElement('div'); document.body.append(host); const root = createRoot(host);
  const render = user => act(async () => root.render(h(CloudgateProvider, { client }, h(AuthContext.Provider, { value: { headerUser: user ? { user: { id: user } } : null } }, h(SettingsContext.Provider, { value: { walletSettings: { enabled: true, countryCode: "ZA", production: false } } }, h(WalletWorkspace))))));
  t.after(async () => { await act(async () => root.unmount()); host.remove(); }); await render(1); return { render, wallet };
}

test('reserved value remains in total balance and pending change is not double counted', async t => {
  await mount(t, { balance: async () => ({ ...scope, available: 0, reserved: 100, restricted: 0, pending: 90, pendingChange: 90 }) });
  assert.match(document.querySelector('[aria-label="Wallet balance"]').textContent, /100.00 eZAR/);
  assert.match(document.body.textContent, /0.00 eZAR available to send/); assert.doesNotMatch(document.body.textContent, /190.00/);
});

test('disconnect requires confirmation, preserves funds on failure, and offers the external reconnect flow', async t => {
  let linked = true, disconnects = 0;
  await mount(t, {
    get: async () => ({ ...scope, linked, phoneNumber: '+27821234567' }),
    disconnect: async input => { assert.equal(input.environment, 'sbx'); if (++disconnects === 1) throw new Error('Connection unavailable'); linked = false; return { production: false, linked: false }; },
    sendCode: async () => ({ verificationToken: 'proof', phoneNumber: '+27821234567', resendAvailableAtUtc: new Date(Date.now() + 60000).toISOString() }),
    link: async input => { assert.equal(input.createWallet, false); linked = true; return { ...scope, linked }; },
  }, { invoiceId: id, amount: 100 });
  sessionStorage.setItem('cg-wallet-send:http://localhost:app:1:sbx', JSON.stringify({ operationId: id }));
  sessionStorage.setItem('cg-wallet-topup:http://localhost:app:2:sbx', 'another users draft');
  await click(button('Disconnect wallet')); assert.match(document.body.textContent, /wallet, funds and transaction history stay intact/);
  await click(button('Keep connected')); assert.equal(disconnects, 0);
  await click(button('Disconnect wallet')); await click(disconnectConfirm());
  assert.match(document.body.textContent, /Connection unavailable/); assert.match(document.body.textContent, /89.00 eZAR/);
  assert.ok(sessionStorage.getItem('cg-wallet-send:http://localhost:app:1:sbx'));
  await click(disconnectConfirm());
  assert.equal(sessionStorage.getItem('cg-wallet-send:http://localhost:app:1:sbx'), null);
  assert.equal(sessionStorage.getItem('cg-wallet-topup:http://localhost:app:1:sbx'), null);
  assert.equal(sessionStorage.getItem('cg-wallet-topup:http://localhost:app:2:sbx'), 'another users draft');
  assert.doesNotMatch(document.body.textContent, /89.00|3287|View top-up|Disconnect wallet/);
  assert.ok(button('Connect wallet'));
  assert.equal(document.querySelector('[aria-label="Wallet PIN"]'), null);
});
test('failed holdings show an error, while empty history shows its own empty state', async t => {
  await mount(t, { holdings: async () => { throw new Error('Records unavailable'); } });
  assert.match(document.body.textContent, /Records unavailable/); assert.doesNotMatch(document.body.textContent, /No vouchers with value/);
  await click(button('Transaction history')); assert.match(document.body.textContent, /Your story starts here/);
});
test('history pagination preserves account context and sign out clears wallet contents', async t => {
  const requests = []; const view = await mount(t, { transactions: async input => { requests.push(input); return { ...scope, totalCount: 11, items: [{ ...op, direction: 'out', status: 3, createdAtUtc: new Date().toISOString() }] }; } });
  await click(button('Transaction history')); assert.match(document.body.textContent, /Transfer sent/); await click(button('Next')); assert.equal(requests.at(-1).skip, 10);
  await view.render(null); assert.doesNotMatch(document.body.textContent, /3287|89.00|Send/);
});
async function unlockForSend() {
  await click(button('Send')); await fill('Receiving voucher wallet account number', recipient); await fill('Amount (eZAR)', '10'); await submit();
  await click(button('Send verification code')); await fill('Verification code', '123456'); await fill('Wallet PIN', '654321'); await submit();
}
const unlockApi = { sendUnlockCode: async () => ({ ...scope, verificationToken: 'proof', phoneNumber: '+27821234567', resendAvailableAtUtc: new Date(Date.now() + 60000).toISOString() }), unlock: async () => ({ ...scope, spendingToken: 'spending-secret', expiresAtUtc: new Date(Date.now() + 600000).toISOString() }) };

test('send unlocks with SMS and PIN, reviews amount, and recovers a lost authorization response without duplicate sends', async t => {
  let prepared = 0, authorized = 0, state = 0;
  await mount(t, { ...unlockApi, prepareSend: async input => { prepared++; assert.equal(input.spendingToken, 'spending-secret'); assert.equal(input.amount, '10'); return { ...scope, operation: { ...op } }; }, authorize: async input => { authorized++; assert.equal(input.pin, '123456'); state = 3; throw new Error('Lost response'); }, operation: async () => ({ ...scope, operation: { ...op, status: state } }) });
  await unlockForSend(); assert.equal(prepared, 1); assert.equal(button('Confirm transfer').disabled, true);
  assert.match(document.body.textContent, /To 9999 9999 9999 9995/);
  await fill('Confirm with wallet PIN', '123456'); await submit();
  assert.match(document.body.textContent, /Completed/); assert.equal(authorized, 1); assert.equal(prepared, 1);
  assert.doesNotMatch(JSON.stringify({ ...sessionStorage }), /spending-secret|654321|123456/);
  await click(button('Done')); assert.ok(button('Send'));
});
test('lost preparation keeps the same request and recovers the existing operation', async t => {
  let prepareCalls = 0, key;
  await mount(t, { ...unlockApi, prepareSend: async input => { prepareCalls++; key = input.requestId; throw new Error('Lost response'); }, operation: async input => { assert.equal(input.requestId, key); return { ...scope, operation: { ...op } }; } });
  await unlockForSend(); assert.equal(prepareCalls, 1); assert.ok(button('Confirm transfer')); assert.doesNotMatch(document.body.textContent, /Lost response/);
});
test('an unsigned transfer can be cancelled and no authorization is submitted', async t => {
  let cancelled = 0;
  await mount(t, { ...unlockApi, prepareSend: async () => ({ ...scope, operation: { ...op } }), cancel: async input => { cancelled++; assert.equal(input.operationId, id); return { ...scope, operation: { ...op, status: 6 } }; }, authorize: async () => assert.fail('must not authorize cancellation') });
  await unlockForSend(); await click(button('Cancel transfer')); assert.equal(cancelled, 1); assert.match(document.body.textContent, /Cancelled/);
  await click(button('Done')); assert.ok(button('Send'));
});
test('top-up retry preserves invoice intent and immediately navigates after saving the invoice', async t => {
  const requests = [];
  await mount(t, { topup: async input => { requests.push(input); if (requests.length === 1) throw new Error('Lost response'); return { ...scope, invoiceId: id, amount: 50, status: 0, paymentUrl: 'https://checkout.example.test/invoice' }; } });
  await click(button('Top up')); await fill('Top-up amount (eZAR)', '50'); await submit(); assert.match(document.body.textContent, /Lost response/);
  assert.equal(checkoutNavigations.length, 0);
  await submit(); assert.equal(requests[0].requestId, requests[1].requestId);
  assert.equal(checkoutNavigations.length, 1);
  assert.equal(checkoutNavigations[0].url, 'https://checkout.example.test/invoice');
  assert.equal(JSON.parse(Object.values(checkoutNavigations[0].saved)[0]).invoiceId, id);
  assert.equal(document.querySelector('[role="dialog"]'), null);
  assert.doesNotMatch(document.body.textContent, /Awaiting payment|Check payment status/);
});

test('reopening a pending top-up verifies its saved invoice and uses the current checkout URL', async t => {
  let statusCalls = 0;
  await mount(t, { topup: async () => assert.fail('must reuse the invoice'), topupStatus: async input => {
    statusCalls++; assert.equal(input.invoiceId, id);
    return { ...scope, invoiceId: id, amount: 100, status: 100, paymentUrl: 'https://checkout.example.test/current' };
  } }, { invoiceId: id, amount: 100, paymentUrl: 'https://stale.example.test/invoice' });
  await click(button('View top-up'));
  assert.equal(statusCalls, 1);
  assert.equal(checkoutNavigations[0].url, 'https://checkout.example.test/current');
});

test('OpenPay top-ups include a return link to the wallet while preserving the original invoice URL', async t => {
  const paymentUrl = 'https://checkout.example.test/pay/openpay/sandbox/' + 'a'.repeat(32);
  await mount(t, { topup: async () => ({ ...scope, invoiceId: id, amount: 50, status: 0, paymentUrl }) });
  await click(button('Top up')); await fill('Top-up amount (eZAR)', '50'); await submit();
  assert.equal(new URL(checkoutNavigations[0].url).searchParams.get('returnTo'), 'http://localhost/account/wallet');
  assert.equal(JSON.parse(Object.values(checkoutNavigations[0].saved)[0]).paymentUrl, paymentUrl);
});

for (const status of [200, 400, 410, 500]) test(`top-up status ${status} stays in the wallet instead of opening checkout`, async t => {
  await mount(t, { topupStatus: async () => ({ ...scope, invoiceId: id, amount: 100, status, paymentUrl: 'https://checkout.example.test/invoice' }) }, { invoiceId: id, amount: 100 });
  await click(button('View top-up')); assert.equal(checkoutNavigations.length, 0);
  assert.match(document.body.textContent, status === 200 ? /Payment confirmed/ : /This checkout is closed/);
});

test('a different wallet response never opens checkout', async t => {
  await mount(t, { topup: async () => ({ ...scope, accountNumber: recipient, invoiceId: id, amount: 50, status: 0, paymentUrl: 'https://checkout.example.test/invoice' }) });
  await click(button('Top up')); await fill('Top-up amount (eZAR)', '50'); await submit();
  assert.equal(checkoutNavigations.length, 0); assert.match(document.body.textContent, /does not match your linked wallet/);
});

test('leaving the wallet during a status check does not redirect when the response arrives', async t => {
  let resolveStatus;
  const view = await mount(t, { topupStatus: () => new Promise(resolve => { resolveStatus = resolve; }) }, { invoiceId: id, amount: 100 });
  await click(button('View top-up')); await view.render(null);
  await act(async () => resolveStatus({ ...scope, invoiceId: id, amount: 100, status: 0, paymentUrl: 'https://checkout.example.test/invoice' }));
  assert.equal(checkoutNavigations.length, 0);
});

test('mobile vouchers in history are not routed into account-transfer authorization', async t => {
  await mount(t, { transactions: async () => ({ ...scope, totalCount: 1, items: [{ ...op, kind: 8, direction: 'out', canAuthorize: true, counterpartyAccountNumber: null, createdAtUtc: new Date().toISOString() }] }) });
  await click(button('Transaction history'));
  assert.match(document.body.textContent, /Mobile voucher sent/);
  assert.match(document.body.textContent, /Open the original payment to review this transaction/);
  assert.equal(button('Review transfer'), undefined);
});
