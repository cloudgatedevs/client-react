import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { JSDOM } from 'jsdom';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { DEFAULT_SETTINGS } from '../src/platform/appearance-model.js';
import { BACKOFFICE_PERMISSIONS as P } from '../src/platform/backoffice-permissions.js';

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/wallet/history?period=month#latest' });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.localStorage = dom.window.localStorage;
globalThis.FormData = dom.window.FormData;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
const require = createRequire(import.meta.url);
const { createRoot } = require('react-dom/client');
const { MemoryRouter, Route } = require('react-router-dom');
const compiled = await build({ stdin: { contents: `
  export { CloudgateBackoffice } from './src/react/Backoffice.jsx';
  export { CloudgateProvider } from './src/react/context.jsx';
  export { AuthContext } from './src/react/auth/AuthProvider.jsx';
  export { SettingsProvider } from './src/react/settings/SettingsProvider.jsx';
  export { WebsiteSettings } from './src/react/pages/WebsiteSettings.jsx';
`, resolveDir: fileURLToPath(new URL('..', import.meta.url)), loader: 'jsx' },
  bundle: true, write: false, format: 'cjs', platform: 'node', packages: 'external', jsx: 'automatic',
  loader: { '.svg': 'dataurl', '.css': 'empty' }, logLevel: 'silent' });
const module = { exports: {} };
new Function('require', 'module', 'exports', compiled.outputFiles[0].text)(require, module, module.exports);
const { CloudgateBackoffice, CloudgateProvider, AuthContext, SettingsProvider, WebsiteSettings } = module.exports;
const h = React.createElement, { act } = React;
const appId = '12345678-1234-1234-1234-123456789abc';

function makeClient({ signedIn = false, values = {}, settingsError = null, profileError = null } = {}) {
  let session = signedIn ? { accessToken: 'test-session' } : undefined;
  let listener = () => {};
  let stored = { ...DEFAULT_SETTINGS, ...values };
  const calls = { login: [], saves: [], profile: 0, content: 0, logout: 0 };
  const client = {
    resolveAppIdentity: async () => ({ webAppId: appId, environment: 'sbx' }),
    initialize: async () => session,
    login: url => calls.login.push(url),
    auth: { enabled: true, tenancyName: 'tenant',
      subscribe: fn => { listener = fn; return () => {}; }, startSessionMonitor: () => () => {},
      logout: () => { calls.logout++; session = undefined; localStorage.removeItem('idp_access_token'); localStorage.removeItem('idp_refresh_token'); listener(undefined); } },
    profile: { get: async () => { calls.profile++; if (profileError) throw profileError;
      return { id: 1, name: 'Member', role: 'User', rolePermissions: [] }; } },
    appearance: {
      getPublic: async () => { if (settingsError) throw settingsError; return { values: stored, revision: appId, allowSelfRegistration: false }; },
      save: async (patch, revision) => { calls.saves.push({ patch, revision }); stored = { ...stored, ...patch }; return { values: stored, revision: appId }; },
    },
  };
  return { client, calls };
}
async function mount(element) {
  const host = document.createElement('div'); document.body.append(host);
  const root = createRoot(host);
  await act(async () => { root.render(element); });
  return { host, close: async () => { await act(async () => root.unmount()); host.remove(); } };
}
function website(client, calls, path = '/wallet/history?period=month#latest') {
  function Content() { React.useEffect(() => { calls.content++; }, []); return h('h1', null, 'Member wallet'); }
  return h(MemoryRouter, { initialEntries: [path], future: { v7_startTransition: true, v7_relativeSplatPath: true } },
    h(CloudgateBackoffice, { client, basePath: '/backoffice', publicHome: h(Content), developerMode: false,
      publicRoutes: h(Route, { path: '/wallet/*', element: h(Content) }) },
      h(Route, { index: true, element: h('h1', null, 'Administration') })));
}

test('existing public pages allow guests without profile requests', async () => {
  const { client, calls } = makeClient();
  const view = await mount(website(client, calls));
  try { assert.match(view.host.textContent, /Member wallet/); assert.equal(calls.profile, 0); assert.deepEqual(calls.login, []); }
  finally { await view.close(); }
});

test('required sign-in redirects guests with their complete deep link before mounting content', async () => {
  const { client, calls } = makeClient({ values: { require_public_website_login: 'true' } });
  const view = await mount(website(client, calls));
  try {
    assert.equal(calls.content, 0); assert.doesNotMatch(view.host.textContent, /Member wallet/);
    assert.deepEqual(calls.login, ['http://localhost/wallet/history?period=month#latest']);
  } finally { await view.close(); }
});

test('ordinary signed-in users enter the website, remain blocked from back office, and are gated after logout', async () => {
  const { client, calls } = makeClient({ signedIn: true, values: { require_public_website_login: 'true' } });
  const view = await mount(website(client, calls));
  try {
    assert.match(view.host.textContent, /Member wallet/); assert.equal(calls.content, 1);
    await act(async () => client.auth.logout());
    assert.doesNotMatch(view.host.textContent, /Member wallet/); assert.match(view.host.textContent, /Session expired/); assert.equal(calls.login.length, 0);
  } finally { await view.close(); }
  const denied = makeClient({ signedIn: true, values: { require_public_website_login: 'true' } });
  const backoffice = await mount(website(denied.client, denied.calls, '/backoffice'));
  try { assert.match(backoffice.host.textContent, /Back office access required/); assert.equal(denied.calls.content, 0); }
  finally { await backoffice.close(); }
});

test('disabled website and failed settings or account checks never expose website content', async () => {
  for (const options of [
    { signedIn: true, values: { enable_public_website: 'false', require_public_website_login: 'true' }, expected: /Back office access required/ },
    { settingsError: new Error('Settings unavailable'), expected: /Website temporarily unavailable/ },
    { signedIn: true, values: { require_public_website_login: 'true' }, profileError: new Error('Connection failed'), expected: /Could not check your account/ },
  ]) {
    const { client, calls } = makeClient(options);
    const view = await mount(website(client, calls));
    try { assert.equal(calls.content, 0); assert.match(view.host.textContent, options.expected); }
    finally { await view.close(); }
  }
});

test('website and profile requests must both finish before protected content mounts', async () => {
  const { client, calls } = makeClient({ signedIn: true });
  let settingsDone, profileDone;
  client.appearance.getPublic = () => new Promise(resolve => { settingsDone = resolve; });
  client.profile.get = () => new Promise(resolve => { profileDone = resolve; });
  const view = await mount(website(client, calls));
  try {
    assert.equal(calls.content, 0);
    await act(async () => settingsDone({ values: { ...DEFAULT_SETTINGS, require_public_website_login: 'true' }, revision: appId }));
    assert.equal(calls.content, 0); assert.deepEqual(calls.login, []);
    await act(async () => profileDone({ id: 1, role: 'User', rolePermissions: [] }));
    assert.equal(calls.content, 1);
  } finally { await view.close(); }
});

test('settings editor saves both access flags with the revision and respects view-only permissions', async () => {
  for (const editable of [true, false]) {
    const { client, calls } = makeClient();
    const grants = [P.Access, P.SettingsView, ...(editable ? [P.SettingsEdit] : [])].map(key => ({ key, value: 'true' }));
    const view = await mount(h(MemoryRouter, null, h(CloudgateProvider, { client },
      h(AuthContext.Provider, { value: { currentUser: { user: { role: 'User', rolePermissions: grants } } } },
        h(SettingsProvider, { publicAccess: true }, h(WebsiteSettings))))));
    try {
      const radio = view.host.querySelector('input[value="signed-in"]');
      assert.equal(radio.disabled, !editable);
      await act(async () => radio.click());
      if (editable) {
        await act(async () => view.host.querySelector('form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true })));
        assert.deepEqual(calls.saves, [{ patch: { enable_public_website: 'true', require_public_website_login: 'true' }, revision: appId }]);
        assert.match(view.host.textContent, /Website settings saved/);
      } else assert.deepEqual(calls.saves, []);
    } finally { await view.close(); }
  }
});

test('an ended session explains why and lets the visitor sign out before returning to the website', async () => {
  const open = makeClient({ signedIn: true });
  const view = await mount(website(open.client, open.calls, '/backoffice'));
  try {
    assert.match(view.host.textContent, /Back office access required/);
    await act(async () => open.client.auth.logout());
    assert.match(view.host.textContent, /Session expired/);
    assert.match(view.host.textContent, /sign-in token has expired or is no longer valid/);
    assert.deepEqual(open.calls.login, []);
    await act(async () => [...view.host.querySelectorAll('button')].find(button => button.textContent === 'Sign out').click());
    assert.match(view.host.textContent, /Member wallet/); assert.doesNotMatch(view.host.textContent, /Session expired/);
    assert.deepEqual(open.calls.login, []);
  } finally { await view.close(); }
  // Sign in again is explicit and preserves the requested deep link.
  for (const values of [{ require_public_website_login: 'true' }, { enable_public_website: 'false' }]) {
    const closed = makeClient({ signedIn: true, values });
    const gated = await mount(website(closed.client, closed.calls, '/backoffice'));
    try {
      await act(async () => closed.client.auth.logout());
      assert.doesNotMatch(gated.host.textContent, /Member wallet/); assert.equal(closed.calls.login.length, 0);
      await act(async () => [...gated.host.querySelectorAll('button')].find(button => button.textContent === 'Sign in again').click());
      assert.deepEqual(closed.calls.login, ['http://localhost/wallet/history?period=month#latest']);
    } finally { await gated.close(); }
  }
});

test('a rejected profile shows session recovery even when public website configuration is missing', async () => {
  for (const status of [401, 403]) {
    const { client, calls } = makeClient({ signedIn: true,
      profileError: Object.assign(new Error('Invalid token'), { status }),
      settingsError: Object.assign(new Error('Set the Cloudgate web app ID and environment to load this website.'), { code: 'configuration' }) });
    const view = await mount(website(client, calls));
    try {
      assert.match(view.host.textContent, /Session expired/); assert.equal(calls.content, 0); assert.deepEqual(calls.login, []);
      await act(async () => [...view.host.querySelectorAll('button')].find(button => button.textContent === 'Sign out').click());
      assert.match(view.host.textContent, /Website not configured/); assert.match(view.host.textContent, /web app ID/);
      assert.doesNotMatch(view.host.textContent, /Session expired/); assert.equal(calls.logout, 2);
    } finally { await view.close(); }
  }
});

test('expired stored credentials show recovery at startup and sign out clears them', async () => {
  const { client, calls } = makeClient();
  localStorage.setItem('idp_access_token', 'expired'); localStorage.setItem('idp_refresh_token', 'rejected');
  const view = await mount(website(client, calls));
  try {
    assert.match(view.host.textContent, /Session expired/); assert.equal(calls.profile, 0); assert.deepEqual(calls.login, []);
    await act(async () => [...view.host.querySelectorAll('button')].find(button => button.textContent === 'Sign out').click());
    assert.equal(localStorage.getItem('idp_access_token'), null); assert.equal(localStorage.getItem('idp_refresh_token'), null);
    assert.match(view.host.textContent, /Member wallet/);
  } finally { localStorage.clear(); await view.close(); }
});

test('website errors offer sign out without mislabeling configuration or network failures as invalid tokens', async () => {
  for (const signedIn of [false, true]) {
    for (const code of ['configuration', 'network']) {
      const { client, calls } = makeClient({ signedIn, settingsError: Object.assign(new Error('Website settings failed'), { code }) });
      const view = await mount(website(client, calls));
      try {
        assert.match(view.host.textContent, code === 'configuration' ? /Website not configured/ : /Website temporarily unavailable/);
        assert.doesNotMatch(view.host.textContent, /Session expired|token/);
        await act(async () => [...view.host.querySelectorAll('button')].find(button => button.textContent === 'Sign out').click());
        assert.equal(calls.logout, 1); assert.deepEqual(calls.login, []); assert.equal(calls.content, 0);
        assert.doesNotMatch(view.host.textContent, /Session expired|token/);
      } finally { await view.close(); }
    }
  }
});

test('a guest opening the back office signs in even when the website is open', async () => {
  const { client, calls } = makeClient();
  const view = await mount(website(client, calls, '/backoffice'));
  try { assert.equal(calls.login.length, 1); assert.doesNotMatch(view.host.textContent, /Member wallet/); }
  finally { await view.close(); }
});

test('user wallet settings require a country, save independently and respect settings permissions', async () => {
  for (const editable of [true, false]) {
    const { client, calls } = makeClient();
    let saved = { enabled: false, countryCode: '', production: false, availableCountries: ['ZA'] }, writes = [];
    const getPublic = client.appearance.getPublic;
    client.appearance.getPublic = async () => ({ ...await getPublic(), walletSettings: saved });
    client.wallet = { updateSettings: async input => { writes.push(input); return saved = { ...input, production: false, availableCountries: ['ZA'] }; } };
    const grants = [P.Access, P.SettingsView, ...(editable ? [P.SettingsEdit] : [])].map(key => ({ key, value: 'true' }));
    const view = await mount(h(MemoryRouter, null, h(CloudgateProvider, { client },
      h(AuthContext.Provider, { value: { currentUser: { user: { role: 'User', rolePermissions: grants } } } },
        h(SettingsProvider, { publicAccess: true }, h(WebsiteSettings))))));
    try {
      const form = view.host.querySelector('[aria-label="User wallet settings"]'), checkbox = form.querySelector('input'), select = form.querySelector('select'), save = form.querySelector('button');
      assert.equal(checkbox.disabled, !editable);
      if (editable) {
        await act(async () => checkbox.click()); assert.equal(save.disabled, true);
        await act(async () => { select.value = 'ZA'; select.dispatchEvent(new window.Event('change', { bubbles: true })); });
        assert.equal(save.disabled, false);
        await act(async () => form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true })));
        assert.deepEqual(writes, [{ enabled: true, countryCode: 'ZA' }]);
        assert.deepEqual(calls.saves, []);
        assert.match(form.textContent, /User wallet settings saved/);
      } else { assert.equal(select.disabled, true); assert.equal(save.disabled, true); assert.deepEqual(writes, []); }
    } finally { await view.close(); }
  }
});
