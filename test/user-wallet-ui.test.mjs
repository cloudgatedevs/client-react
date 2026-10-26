import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { JSDOM } from 'jsdom';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/profile', pretendToBeVisual: true });
for (const key of ['window', 'document', 'HTMLElement', 'HTMLInputElement', 'Element', 'Node', 'NodeFilter', 'MutationObserver', 'CustomEvent', 'HTMLFormElement', 'Event'])
  globalThis[key] = key === 'window' ? dom.window : key === 'document' ? dom.window.document : dom.window[key];
globalThis.getComputedStyle = window.getComputedStyle.bind(window);
document.elementFromPoint = () => null;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
window.ResizeObserver = globalThis.ResizeObserver;
const require = createRequire(import.meta.url), { createRoot } = require('react-dom/client');
const compiled = await build({ stdin: { contents: `export { UserWallet } from './src/react/components/UserWallet.jsx'; export { CloudgateProvider } from './src/react/context.jsx'; export { AuthContext } from './src/react/auth/AuthProvider.jsx'; export { SettingsContext } from './src/react/settings/SettingsProvider.jsx';`, resolveDir: fileURLToPath(new URL('..', import.meta.url)), loader: 'jsx' },
  bundle: true, write: false, format: 'cjs', platform: 'node', packages: 'external', jsx: 'automatic', loader: { '.svg': 'dataurl' }, logLevel: 'silent' });
const module = { exports: {} }; new Function('require', 'module', 'exports', compiled.outputFiles[0].text)(require, module, module.exports);
const { UserWallet, CloudgateProvider, AuthContext, SettingsContext } = module.exports;
const h = React.createElement, { act } = React;
const linked = { linked: true, production: false, accountNumber: '0123456789012345', phoneNumber: '+27820000000' };
async function mount(t, wallet, userId = 1) {
  const client = { wallet, config: { apiUrl: 'http://localhost', environment: 'sbx' }, auth: { tenancyName: 'app' }, resolveAppIdentity: async () => ({ environment: 'sbx' }) };
  const host = document.createElement('div'); document.body.append(host); const root = createRoot(host);
  t.after(async () => { await act(async () => root.unmount()); host.remove(); });
  const render = async id => act(async () => root.render(h(CloudgateProvider, { client }, h(AuthContext.Provider, { value: { headerUser: id ? { user: { id } } : null } }, h(SettingsContext.Provider, { value: { walletSettings: { enabled: true, countryCode: "ZA", production: false } } }, h(UserWallet))))));
  await render(userId); return { render };
}
const button = label => [...document.querySelectorAll('button')].find(b => b.textContent.trim() === label);
const fill = async (label, value) => act(async () => {
  const input = document.querySelector(`[aria-label="${label}"]`) || document.getElementById([...document.querySelectorAll('label')].find(l => l.textContent === label).htmlFor);
  Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, value);
  input.dispatchEvent(new window.Event('input', { bubbles: true })); input.dispatchEvent(new window.Event('change', { bubbles: true }));
});
const submit = async () => act(async () => document.querySelector('form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true })));

test('linked account shows formatted number, available and reserved funds; balance failure never shows zero', async t => {
  let fail = false;
  await mount(t, { get: async () => ({ ...linked }), balance: async () => { if (fail) throw new Error('Balance unavailable'); return { accountNumber: linked.accountNumber, available: 89, reserved: 10, pending: 0 }; } });
  assert.match(document.body.textContent, /0123 4567 8901 2345/); assert.match(document.body.textContent, /89.00 eZAR/); assert.match(document.body.textContent, /10.00 eZAR reserved/);
  fail = true; await act(async () => button('Refresh wallet').click());
  assert.match(document.body.textContent, /Balance unavailable/); assert.doesNotMatch(document.body.textContent, /0.00 eZAR|89.00 eZAR/);
});
test('wallet state is cleared on sign out and requests require a signed-in user', async t => {
  let calls = 0;
  const view = await mount(t, { get: async () => { calls++; return linked; }, balance: async () => ({ accountNumber: linked.accountNumber, available: 42 }) });
  assert.match(document.body.textContent, /42.00 eZAR/);
  await view.render(null); assert.doesNotMatch(document.body.textContent, /0123|42.00|Activate wallet/); assert.equal(calls, 1);
});
test('connect verifies the mobile inside the app and requires an explicit new-wallet choice', async t => {
  const calls = []; let connected = false;
  await mount(t, { get: async () => connected ? linked : { linked: false, production: false },
    balance: async () => ({ accountNumber: linked.accountNumber, available: 0 }),
    sendCode: async input => { calls.push(input); return { verificationToken: 'proof', phoneNumber: '+27821234567', expiresAtUtc: new Date(Date.now() + 300000).toISOString(), resendAvailableAtUtc: new Date(Date.now() + 60000).toISOString() }; },
    link: async input => { calls.push(input); if (!input.createWallet) return { linked: false, production: false, accountNotFound: true }; connected = true; return linked; } });
  await act(async () => button('Connect wallet').click());
  await fill('Mobile number', '0821234567'); await submit();
  assert.deepEqual(calls[0], { environment: 'sbx', phoneNumber: '0821234567' });
  assert.equal(document.querySelector('[aria-label="Wallet PIN"]'), null);
  assert.ok(button('Continue to PIN').disabled);
  await fill('Verification code', '123456'); await submit();
  assert.equal(calls.length, 1);
  const pinInput = document.querySelector('[aria-label="Wallet PIN"]');
  assert.equal(pinInput.type, 'password'); assert.equal(pinInput.maxLength, 6);
  assert.equal(pinInput.closest('[data-input-otp-container]').querySelectorAll('[aria-hidden="true"]').length, 6);
  await fill('Wallet PIN', '123456'); await submit();
  assert.equal(calls[1].createWallet, false); assert.ok(button('Create a new wallet'));
  await act(async () => button('Create a new wallet').click());
  assert.equal(document.querySelector('[aria-label="Choose wallet PIN"]').value, '');
  await fill('Choose wallet PIN', '123456'); await fill('Confirm wallet PIN', '123456'); await submit();
  assert.equal(calls[2].createWallet, true); assert.equal(calls[2].confirmPin, '123456');
  assert.match(document.body.textContent, /Open wallet/); assert.equal(document.querySelector('[role="dialog"]'), null);
  assert.doesNotMatch(JSON.stringify({ ...window.sessionStorage }), /proof|123456/);
});

test('new-wallet setup keeps code entry separate, reuses the SMS when going back, and requires matching PINs', async t => {
  let sends = 0, links = 0;
  await mount(t, { get: async () => ({ linked: false, production: false }),
    sendCode: async () => { sends++; return { verificationToken: 'proof', phoneNumber: '+27821234567', expiresAtUtc: new Date(Date.now() + 300000).toISOString(), resendAvailableAtUtc: new Date(Date.now() + 60000).toISOString() }; },
    link: async input => { links++; assert.equal(input.createWallet, true); assert.equal(input.pin, '654321'); assert.equal(input.confirmPin, '654321'); return linked; },
    balance: async () => ({ accountNumber: linked.accountNumber, available: 0 }) });
  await act(async () => button('Connect wallet').click());
  await act(async () => document.querySelector('input[value="create"]').click());
  await fill('Mobile number', '0821234567'); await submit();
  await act(async () => button('Back').click()); await submit(); assert.equal(sends, 1);
  await fill('Verification code', '12345'); assert.ok(button('Continue to PIN').disabled);
  await fill('Verification code', '123456'); await submit();
  await fill('Choose wallet PIN', '65432'); assert.ok(button('Create wallet').disabled);
  await fill('Choose wallet PIN', '654321'); await fill('Confirm wallet PIN', '654320'); assert.ok(button('Create wallet').disabled);
  assert.equal(links, 0);
  await fill('Confirm wallet PIN', '654321'); await submit(); assert.equal(links, 1);
});

test('expired SMS codes block setup and can be replaced without leaving the app', async t => {
  let sends = 0;
  await mount(t, { get: async () => ({ linked: false, production: false }),
    sendCode: async () => ({ verificationToken: `proof-${++sends}`, phoneNumber: '+27821234567', expiresAtUtc: new Date(Date.now() + (sends === 1 ? -1000 : 300000)).toISOString(), resendAvailableAtUtc: new Date(Date.now() - 1000).toISOString() }),
    link: async () => assert.fail('expired code must not be submitted') });
  await act(async () => button('Connect wallet').click());
  await fill('Mobile number', '0821234567'); await submit();
  assert.match(document.body.textContent, /Your SMS code has expired/);
  await fill('Verification code', '123456'); assert.ok(button('Continue to PIN').disabled);
  await act(async () => button('Send a new code').click()); assert.equal(sends, 2);
  assert.doesNotMatch(document.body.textContent, /Your SMS code has expired/);
  assert.equal(document.querySelector('[aria-label="Verification code"]').value, '');
});

test('connected wallet opens the voucher workspace within the app', async t => {
  await mount(t, { get: async () => ({ ...linked, manageWalletUrl: 'https://wallet.example/' }), balance: async () => ({ accountNumber: linked.accountNumber, available: 89 }) });
  const link = [...document.querySelectorAll('a')].find(a => a.textContent.includes('Open wallet'));
  assert.equal(link.href, 'http://localhost/account/wallet'); assert.equal(link.target, '');
});

test('a late initial status read cannot overwrite a completed connection', async t => {
  const state = 'e'.repeat(64), code = 'f'.repeat(64);
  window.sessionStorage.setItem('cloudgate-wallet-connect:' + state, JSON.stringify({
    scope: 'http://localhost:app:1:sbx', connectionTicket: 'ticket', expiresAtUtc: new Date(Date.now() + 600000).toISOString(), returnPath: '/profile'
  }));
  window.history.replaceState(null, '', `/profile?ezar_state=${state}&ezar_code=${code}`);
  t.after(() => { window.history.replaceState(null, '', '/profile'); window.sessionStorage.clear(); });
  let finishInitial, reads = 0, exchanges = 0;
  await mount(t, {
    get: () => ++reads === 1 ? new Promise(resolve => { finishInitial = resolve; }) : Promise.resolve({ ...linked, manageWalletUrl: 'https://wallet.example/' }),
    completeConnect: async input => { exchanges++; assert.equal(input.code, code); return linked; },
    balance: async () => ({ accountNumber: linked.accountNumber, available: 89 })
  });
  await act(async () => finishInitial({ linked: false }));
  assert.equal(exchanges, 1); assert.equal(reads, 2);
  assert.match(document.body.textContent, /89.00 eZAR/); assert.match(document.body.textContent, /Open wallet/);
  assert.equal(button('Connect wallet'), undefined); assert.doesNotMatch(window.location.href, /ezar_code/);
});
