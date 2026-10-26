import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { JSDOM } from 'jsdom';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/orders/9', pretendToBeVisual: true });
for (const key of ['window', 'document', 'HTMLElement', 'HTMLInputElement', 'Element', 'Node', 'NodeFilter', 'MutationObserver', 'CustomEvent', 'HTMLFormElement', 'Event', 'sessionStorage'])
  globalThis[key] = key === 'window' ? dom.window : key === 'document' ? dom.window.document : dom.window[key];
globalThis.getComputedStyle = window.getComputedStyle.bind(window); globalThis.IS_REACT_ACT_ENVIRONMENT = true;
document.elementFromPoint = () => null;
globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} }; window.ResizeObserver = globalThis.ResizeObserver;
const require = createRequire(import.meta.url), { createRoot } = require('react-dom/client');
const compiled = await build({ stdin: { contents: `export { PayWithEzarButton } from './src/react/components/PayWithEzarButton.jsx'; export { CloudgateProvider } from './src/react/context.jsx'; export { AuthContext } from './src/react/auth/AuthProvider.jsx'; export { SettingsContext } from './src/react/settings/SettingsProvider.jsx';`, resolveDir: fileURLToPath(new URL('..', import.meta.url)), loader: 'jsx' }, bundle: true, write: false, format: 'cjs', platform: 'node', packages: 'external', jsx: 'automatic', loader: { '.svg': 'dataurl', '.css': 'empty' }, logLevel: 'silent' });
const module = { exports: {} }; new Function('require', 'module', 'exports', compiled.outputFiles[0].text)(require, module, module.exports);
const { PayWithEzarButton, CloudgateProvider, AuthContext, SettingsContext } = module.exports, { act } = React, h = React.createElement;
const scope = { production: false, accountNumber: '3287272359041533' }, invoiceId = '76019e19-7607-46e3-b1b5-1a447d46ffda', operationId = '86019e19-7607-46e3-b1b5-1a447d46ffda';
const invoice = { production: false, paymentId: 9, invoiceId, amount: 25, currency: 'ZAR', description: 'Coffee and lunch', reference: 'ORDER-9', merchantName: 'The Corner Shop', paid: false, canPay: true, status: 0 };
const operation = { id: operationId, invoiceId, status: 0, kind: 2, amount: 25, fee: 1, authorizationDigest: 'a'.repeat(64), expiresAtUtc: new Date(Date.now() + 600000).toISOString() };
const ticket = { ...scope, verificationToken: 'verification-secret', phoneNumber: '+27821234567', expiresAtUtc: new Date(Date.now() + 300000).toISOString(), resendAvailableAtUtc: new Date(Date.now() + 60000).toISOString() };
const session = { ...scope, spendingToken: 'spending-secret', expiresAtUtc: new Date(Date.now() + 600000).toISOString() };
const button = text => [...document.querySelectorAll('button')].find(b => b.textContent.trim() === text);
const click = element => { assert.ok(element, 'Expected button'); return act(async () => element.click()); };
const fill = (label, value) => act(async () => {
  const input = document.querySelector(`[aria-label="${label}"]`) || document.getElementById([...document.querySelectorAll('label')].find(l => l.textContent === label)?.htmlFor);
  assert.ok(input, `Expected ${label}`); Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, value);
  input.dispatchEvent(new window.Event('input', { bubbles: true })); input.dispatchEvent(new window.Event('change', { bubbles: true }));
});
const submit = () => act(async () => document.querySelector('form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true })));
async function mount(t, overrides = {}, onPaid = () => {}) {
  sessionStorage.clear();
  let state = 0, prepared = false, paid = 0;
  const calls = [];
  const wallet = {
    get: async () => ({ ...scope, linked: true, phoneNumber: '+27821234567' }),
    balance: async () => ({ ...scope, available: 100, reserved: 0, pending: 0, restricted: 0 }),
    invoice: async () => invoice,
    sendUnlockCode: async () => ticket,
    unlock: async () => session,
    payInvoice: async input => { prepared = true; calls.push(['prepare', input]); return { ...scope, operation: { ...operation, status: state } }; },
    operation: async input => { calls.push(['status', input]); return { ...scope, operation: prepared ? { ...operation, status: state } : null }; },
    authorize: async input => { calls.push(['authorize', input]); state = 1; return { ...scope, operation: { ...operation, status: state } }; },
    cancel: async () => { state = 6; return { ...scope, operation: { ...operation, status: state } }; }, ...overrides,
  };
  const client = { wallet, config: { apiUrl: 'http://localhost', environment: 'sbx' }, auth: { tenancyName: 'app' }, resolveAppIdentity: async () => ({ environment: 'sbx' }) };
  const host = document.createElement('div'); document.body.append(host); const root = createRoot(host);
  const render = ({ user = 1, paymentId = 9, enabled = true } = {}) => act(async () => root.render(h(React.StrictMode, null, h(CloudgateProvider, { client }, h(AuthContext.Provider, { value: { headerUser: user ? { user: { id: user } } : null } }, h(SettingsContext.Provider, { value: { walletSettings: { enabled, countryCode: 'ZA', production: false } } }, h(PayWithEzarButton, { paymentId, onPaid: async value => { paid++; await onPaid(value); } })))))));
  t.after(async () => { await act(async () => root.unmount()); host.remove(); }); await render();
  return { calls, wallet, render, setState: value => { state = value; }, paid: () => paid };
}
async function review() {
  await click(button('Pay with eZAR')); await click(button('Continue')); await click(button('Send verification code'));
  await fill('Verification code', '123456'); await fill('Wallet PIN', '654321'); await click(button('Unlock wallet'));
}

test('purchase stays in the app, reviews merchant and fee, and reports success only after confirmation', async t => {
  const view = await mount(t); await review();
  assert.match(document.body.textContent, /The Corner Shop/); assert.match(document.body.textContent, /Coffee and lunch · ORDER-9/);
  assert.match(document.body.textContent, /Processing fee1.00 eZARTotal26.00 eZAR/);
  assert.equal(button('Confirm payment').disabled, true);
  const pin = document.querySelector('[aria-label="Confirm with wallet PIN"]'); assert.equal(pin.type, 'password'); assert.equal(pin.maxLength, 6);
  await fill('Confirm with wallet PIN', '654321'); await click(button('Confirm payment'));
  assert.equal(view.paid(), 0); assert.match(document.body.textContent, /payment is processing/);
  view.setState(3); await click(button('Check payment status')); await click(button('Check payment status'));
  assert.equal(view.paid(), 1); assert.match(document.body.textContent, /Payment successful/); assert.match(document.body.textContent, new RegExp(operationId));
  assert.equal(window.location.href, 'http://localhost/orders/9'); assert.equal(document.querySelector('a[href]'), null);
  assert.doesNotMatch(JSON.stringify({ ...sessionStorage }), /spending-secret|verification-secret|654321|123456/);
  assert.equal(view.calls.filter(([kind]) => kind === 'prepare').length, 1);
  assert.equal(view.calls.filter(([kind]) => kind === 'authorize').length, 1);
});

test('closing and reopening recovers an existing reservation without preparing twice', async t => {
  const view = await mount(t); await review();
  const original = view.calls.find(([kind]) => kind === 'prepare')[1].requestId;
  await click(button('Close')); await click(button('Pay with eZAR')); await click(button('Continue'));
  assert.equal(view.calls.filter(([kind]) => kind === 'prepare').length, 1);
  assert.ok(button('Confirm payment')); assert.match(JSON.stringify({ ...sessionStorage }), new RegExp(original));
});

test('remounting loses spending access but preserves the operation for recovery after unlocking', async t => {
  const view = await mount(t); await review(); await view.render({ user: null }); await view.render(); await review();
  assert.equal(view.calls.filter(([kind]) => kind === 'prepare').length, 1);
  assert.ok(view.calls.some(([kind, input]) => kind === 'status' && input.operationId === operationId));
  assert.ok(button('Confirm payment'));
});

test('an incorrect PIN keeps the original payment available for correction', async t => {
  let attempts = 0;
  const view = await mount(t, { authorize: async () => { attempts++; throw new Error('Incorrect wallet PIN'); } });
  await review(); await fill('Confirm with wallet PIN', '111111'); await click(button('Confirm payment'));
  assert.match(document.body.textContent, /Incorrect wallet PIN/); assert.equal(view.paid(), 0); assert.equal(button('Confirm payment').disabled, true);
  await fill('Confirm with wallet PIN', '654321'); await click(button('Confirm payment'));
  assert.equal(attempts, 2); assert.equal(view.calls.filter(([kind]) => kind === 'prepare').length, 1);
});

test('losing the prepare response recovers the same operation before asking for a payment PIN', async t => {
  let prepared = 0, key;
  await mount(t, { payInvoice: async input => { prepared++; key = input.requestId; throw new Error('Connection lost'); }, operation: async input => {
    assert.equal(input.requestId, key); return { ...scope, operation };
  } });
  await review(); assert.equal(prepared, 1); assert.ok(button('Confirm payment')); assert.doesNotMatch(document.body.textContent, /Connection lost/);
});

test('losing the authorization response recovers completion without authorizing twice', async t => {
  let authorized = 0;
  const view = await mount(t, { authorize: async () => { authorized++; throw new Error('Lost response'); }, operation: async () => ({ ...scope, operation: { ...operation, status: 3 } }) });
  await review(); await fill('Confirm with wallet PIN', '654321'); await click(button('Confirm payment'));
  assert.equal(authorized, 1); assert.equal(view.paid(), 1); assert.match(document.body.textContent, /Payment successful/);
});

test('retry after an uncommitted prepare uses the original request ID', async t => {
  const keys = []; let tries = 0;
  await mount(t, { payInvoice: async input => { keys.push(input.requestId); if (++tries === 1) throw new Error('Network unavailable'); return { ...scope, operation }; }, operation: async () => ({ ...scope, operation: null }) });
  await review(); assert.match(document.body.textContent, /Network unavailable/); await click(button('Continue'));
  assert.equal(keys.length, 2); assert.equal(keys[0], keys[1]); assert.ok(button('Confirm payment'));
});

test('a reservation can be cancelled without authorizing payment', async t => {
  const view = await mount(t); await review(); await click(button('Cancel payment'));
  assert.match(document.body.textContent, /Reserved funds have been released/); assert.equal(view.paid(), 0);
  assert.equal(view.calls.filter(([kind]) => kind === 'authorize').length, 0);
});

for (const field of ['invoiceId', 'amount', 'accountNumber', 'production']) test(`a mismatched ${field} response never enables confirmation`, async t => {
  const result = { ...scope, operation: { ...operation } };
  if (field === 'invoiceId') result.operation.invoiceId = '96019e19-7607-46e3-b1b5-1a447d46ffda';
  if (field === 'amount') result.operation.amount = 26;
  if (field === 'accountNumber') result.accountNumber = '9999999999999995';
  if (field === 'production') result.production = true;
  await mount(t, { payInvoice: async () => result, operation: async () => ({ ...scope, operation: null }) });
  await review(); assert.equal(button('Confirm payment'), undefined); assert.ok(document.querySelector('[role="alert"]'));
});

test('paid or closed invoices cannot start another payment', async t => {
  const view = await mount(t, { invoice: async () => ({ ...invoice, paid: true, canPay: false, status: 200 }) });
  await click(button('Pay with eZAR')); assert.match(document.body.textContent, /already been paid/); assert.equal(button('Continue'), undefined);
  await submit(); assert.deepEqual(view.calls, []);
});

test('expired SMS code must be resent and cannot unlock or prepare payment', async t => {
  let unlocks = 0;
  await mount(t, { sendUnlockCode: async () => ({ ...ticket, expiresAtUtc: new Date(Date.now() - 1000).toISOString(), resendAvailableAtUtc: new Date(Date.now() - 1000).toISOString() }), unlock: async () => { unlocks++; return session; } });
  await review(); assert.equal(unlocks, 0); assert.equal(button('Unlock wallet').disabled, true); assert.match(document.body.textContent, /code has expired/); assert.equal(button('Resend code').disabled, false);
});

test('an insufficient balance is reported and server rejection never produces a success receipt', async t => {
  const view = await mount(t, { balance: async () => ({ ...scope, available: 5 }), payInvoice: async () => { throw new Error('Insufficient available funds'); } });
  await click(button('Pay with eZAR')); assert.match(document.body.textContent, /available balance is below/);
  await click(button('Continue')); await click(button('Send verification code')); await fill('Verification code', '123456'); await fill('Wallet PIN', '654321'); await click(button('Unlock wallet'));
  assert.match(document.body.textContent, /Insufficient available funds/); assert.equal(view.paid(), 0); assert.equal(button('Confirm payment'), undefined);
});

test('signing out while unlock is pending discards the late response and never reserves funds', async t => {
  let finish;
  const view = await mount(t, { unlock: () => new Promise(resolve => { finish = resolve; }) });
  await click(button('Pay with eZAR')); await click(button('Continue')); await click(button('Send verification code')); await fill('Verification code', '123456'); await fill('Wallet PIN', '654321'); await click(button('Unlock wallet'));
  await view.render({ user: null }); await act(async () => finish(session));
  assert.deepEqual(view.calls, []); assert.equal(document.querySelector('[role="dialog"]'), null); assert.equal(button('Pay with eZAR').disabled, true);
});

test('switching invoice or identity discards the open payment and spending session', async t => {
  const view = await mount(t); await review(); await view.render({ paymentId: 10 });
  assert.equal(document.querySelector('[role="dialog"]'), null);
  await view.render({ user: 2 }); await click(button('Pay with eZAR')); await click(button('Continue'));
  assert.ok(button('Send verification code')); assert.equal(view.calls.filter(([kind]) => kind === 'prepare').length, 1);
});

test('an unlinked user connects inline and returns to the same order', async t => {
  let linked = false;
  await mount(t, { get: async () => ({ ...scope, linked, phoneNumber: ticket.phoneNumber }), sendCode: async () => ticket, link: async () => { linked = true; return { ...scope, linked }; } });
  await click(button('Pay with eZAR')); await click(button('Connect wallet')); await fill('Mobile number', '0821234567'); await submit();
  await fill('Verification code', '123456'); await submit(); await fill('Wallet PIN', '654321'); await submit();
  assert.match(document.body.textContent, /Coffee and lunch · ORDER-9/); assert.ok(button('Continue')); assert.equal(window.location.pathname, '/orders/9');
});

test('a merchant callback failure leaves the payment successful and does not retry the charge', async t => {
  const view = await mount(t, { authorize: async () => ({ ...scope, operation: { ...operation, status: 3 } }) }, () => { throw new Error('Order unavailable'); });
  await review(); await fill('Confirm with wallet PIN', '654321'); await click(button('Confirm payment'));
  assert.match(document.body.textContent, /Payment successful/); assert.match(document.body.textContent, /order view could not refresh/); assert.equal(view.paid(), 1);
});
