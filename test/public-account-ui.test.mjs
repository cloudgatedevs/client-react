import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { JSDOM } from 'jsdom';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { DEFAULT_SETTINGS } from '../src/platform/appearance-model.js';

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/account/profile', pretendToBeVisual: true });
for (const key of ['window', 'document', 'HTMLElement', 'HTMLInputElement', 'Element', 'Node', 'NodeFilter', 'MutationObserver', 'CustomEvent', 'HTMLFormElement', 'Event'])
  globalThis[key] = key === 'window' ? dom.window : key === 'document' ? dom.window.document : dom.window[key];
globalThis.getComputedStyle = window.getComputedStyle.bind(window);
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
const require = createRequire(import.meta.url), { createRoot } = require('react-dom/client'), { MemoryRouter } = require('react-router-dom');
const compiled = await build({ stdin: { contents: `
  export { CloudgateBackoffice } from './src/react/Backoffice.jsx';
  export { UserMenu } from './src/react/components/AccountMenu.jsx';
`, resolveDir: fileURLToPath(new URL('..', import.meta.url)), loader: 'jsx' },
  bundle: true, write: false, format: 'cjs', platform: 'node', packages: 'external', jsx: 'automatic', loader: { '.svg': 'dataurl', '.css': 'empty' }, logLevel: 'silent' });
const module = { exports: {} }; new Function('require', 'module', 'exports', compiled.outputFiles[0].text)(require, module, module.exports);
const { CloudgateBackoffice, UserMenu } = module.exports, h = React.createElement, { act } = React;
const account = '0123456789012345';
function setup({ signedIn = true, linked = true, role = 'User' } = {}) {
  let session = signedIn ? { accessToken: 'session', user: { id: 1 } } : undefined, notify;
  const state = { profile: { id: 1, name: 'Alex', surname: 'Taylor', email: 'alex@example.test', role, rolePermissions: [], isEmailConfirmed: true }, linked, failBalance: false, failSave: false, walletSettings: { enabled: true, countryCode: 'ZA', production: false } };
  const calls = { saves: [], wallets: 0, logouts: 0, logins: [] };
  const client = {
    config: { apiUrl: 'http://localhost', environment: 'sbx' },
    resolveAppIdentity: async () => ({ environment: 'sbx' }), initialize: async () => session, login: url => calls.logins.push(url),
    auth: { enabled: true, tenancyName: 'app', subscribe: fn => { notify = fn; return () => {}; }, startSessionMonitor: () => () => {},
      logout: () => { calls.logouts++; session = undefined; notify(undefined); } },
    profile: { get: async () => ({ ...state.profile }), update: async values => { calls.saves.push(values); if (state.failSave) throw new Error('Please try again'); state.profile = { ...state.profile, ...values }; return { ...state.profile }; } },
    appearance: { getPublic: async () => ({ values: { ...DEFAULT_SETTINGS, app_name: 'Example' }, revision: 'rev', allowSelfRegistration: false, walletSettings: state.walletSettings }) },
    wallet: { get: async () => { calls.wallets++; return { linked: state.linked, accountNumber: account, phoneNumber: '+27820000000', production: false }; },
      balance: async () => { if (state.failBalance) throw new Error('Balance unavailable'); return { accountNumber: account, available: 89, pending: 0, reserved: 0, restricted: 0 }; } },
  };
  return { state, client, calls };
}
async function mount(t, config, path = '/') {
  const host = document.createElement('div'); document.body.append(host); const root = createRoot(host);
  await act(async () => root.render(h(MemoryRouter, { initialEntries: [path], future: { v7_startTransition: true, v7_relativeSplatPath: true } },
    h(CloudgateBackoffice, { client: config.client, basePath: '/backoffice', publicHome: h('header', null, h(UserMenu), h('h1', null, 'Website')), developerMode: false }))));
  t.after(async () => { await act(async () => root.unmount()); host.remove(); });
  return host;
}
const button = text => [...document.querySelectorAll('button')].find(item => item.textContent.trim() === text);
const click = async element => act(async () => element.click());
const fill = async (label, value) => act(async () => {
  const input = document.getElementById([...document.querySelectorAll('label')].find(item => item.textContent === label).htmlFor);
  Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, value);
  input.dispatchEvent(new window.Event('input', { bubbles: true })); input.dispatchEvent(new window.Event('change', { bubbles: true }));
});
const submit = async () => act(async () => document.querySelector('form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true })));

test('public menu shows the linked balance, supports keyboard navigation, and hides admin controls from regular users', async t => {
  const config = setup(); const host = await mount(t, config);
  assert.equal(config.calls.wallets, 0, 'Wallet is loaded only when the menu opens');
  const trigger = host.querySelector('[aria-haspopup="menu"]'); await click(trigger);
  assert.match(host.textContent, /89.00 eZAR/); assert.match(host.textContent, /0123 4567 8901 2345/);
  assert.doesNotMatch(host.textContent, /Back office/);
  assert.equal(document.activeElement.getAttribute('href'), '/account/profile');
  await act(async () => document.activeElement.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })));
  assert.equal(document.activeElement.getAttribute('href'), '/account/wallet');
  await act(async () => document.activeElement.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
  assert.equal(trigger.getAttribute('aria-expanded'), 'false'); assert.equal(document.activeElement, trigger);
  await click(trigger); await click(host.querySelector('[href="/account/wallet"]'));
  assert.match(host.textContent, /My wallet/); assert.match(host.textContent, /89.00 eZAR/);
});

test('regular users can edit their profile without gaining back-office access; failed saves retain their edits', async t => {
  const config = setup(); const host = await mount(t, config, '/account/profile');
  assert.match(host.textContent, /My profile/); assert.ok(host.querySelector('[aria-label="Change profile picture"]'));
  assert.equal(button('Save changes').disabled, true);
  await fill('First name', 'New name'); config.state.failSave = true; await submit();
  assert.match(host.textContent, /Please try again/); assert.equal(host.querySelector('input').value, 'New name');
  config.state.failSave = false; await submit();
  assert.match(host.textContent, /Your profile has been updated/);
  assert.equal(button('Save changes').disabled, true); assert.equal(config.calls.saves.at(-1).name, 'New name');
  assert.match(host.querySelector('[aria-label="Profile overview"]').textContent, /New name Taylor/);
  assert.match(host.querySelector('[aria-haspopup="menu"]').getAttribute('aria-label'), /New name Taylor/);
});

test('refreshes preserve unsaved profile edits and discard restores the server details', async t => {
  const config = setup(); const host = await mount(t, config, '/account/profile');
  await fill('First name', 'Draft'); config.state.profile.name = 'Updated elsewhere';
  await act(async () => window.dispatchEvent(new window.Event('focus')));
  assert.equal(host.querySelector('input').value, 'Draft');
  await click(button('Discard')); assert.equal(host.querySelector('input').value, 'Updated elsewhere');
  config.state.profile.name = 'Refreshed';
  await act(async () => window.dispatchEvent(new window.Event('focus')));
  assert.equal(host.querySelector('input').value, 'Refreshed');
});

test('wallet failures never invent a zero balance and the menu offers activation for unlinked users', async t => {
  const config = setup(); config.state.failBalance = true; const host = await mount(t, config);
  await click(host.querySelector('[aria-haspopup="menu"]'));
  assert.match(host.textContent, /Balance unavailable/); assert.doesNotMatch(host.textContent, /0.00 eZAR/);
  await click(host.querySelector('[aria-haspopup="menu"]')); config.state.linked = false;
  await click(host.querySelector('[aria-haspopup="menu"]')); assert.match(host.textContent, /Connect your wallet/);
  await click(host.querySelector('[href="/account/wallet"]')); assert.ok(button('Connect wallet'));
});

test('logout clears personal and wallet data and returns to the public website', async t => {
  const config = setup(); const host = await mount(t, config, '/account/profile');
  await click(host.querySelector('[aria-haspopup="menu"]')); await click(button('Log out'));
  assert.match(host.textContent, /Website/); assert.doesNotMatch(host.textContent, /Alex|0123|89.00|My profile/); assert.equal(config.calls.logouts, 1);
});

test('guests cannot mount the profile page or issue wallet requests', async t => {
  const config = setup({ signedIn: false }); const host = await mount(t, config, '/account/profile');
  assert.equal(config.calls.logins.length, 1); assert.equal(config.calls.wallets, 0); assert.doesNotMatch(host.textContent, /Personal details|Alex|0123/);
});

for (const walletSettings of [null, { enabled: false, countryCode: 'ZA', production: false }, { enabled: true, countryCode: 'US', production: false }, { enabled: true, countryCode: 'ZA', production: true }]) {
  test(`wallet navigation and reads are unavailable for configuration ${JSON.stringify(walletSettings)}`, async t => {
    const config = setup(); config.state.walletSettings = walletSettings;
    const host = await mount(t, config, '/account/wallet');
    assert.match(host.textContent, /Wallet unavailable/);
    await click(host.querySelector('[aria-haspopup="menu"]'));
    assert.equal(host.querySelector('[href="/account/wallet"]'), null);
    assert.equal(config.calls.wallets, 0);
  });
}
test('coming soon keeps wallet navigation visible without reading balances or exposing actions', async t => {
  const config = setup();
  config.state.walletSettings = { enabled: false, configuredEnabled: true, countryCode: 'ZA',
    availableCountries: ['ZA'], production: false, comingSoon: true, availabilityMessage: 'Coming soon.' };
  const host = await mount(t, config, '/account/wallet');
  assert.match(host.textContent, /Coming soon/);
  assert.doesNotMatch(host.textContent, /Connect wallet|Send funds|Top up/);
  await click(host.querySelector('[aria-haspopup="menu"]'));
  assert.ok(host.querySelector('[href="/account/wallet"]'));
  assert.equal(config.calls.wallets, 0);
});

test('returning from Cloudgate refreshes wallet availability without losing profile edits', async t => {
  const config = setup(); const host = await mount(t, config, '/account/profile');
  await fill('First name', 'Draft');
  config.state.walletSettings = { enabled: false, countryCode: 'ZA', production: false };
  await act(async () => window.dispatchEvent(new window.Event('focus')));
  assert.equal(host.querySelector('[href="/account/wallet"]'), null);
  assert.equal(host.querySelector('input').value, 'Draft');
  assert.doesNotMatch(host.textContent, /Your eZAR wallet|Your wallet stays yours/);
});
