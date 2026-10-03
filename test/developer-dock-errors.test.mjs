import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { JSDOM } from 'jsdom';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/backoffice' });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
const require = createRequire(import.meta.url);
const { createRoot } = require('react-dom/client');
const { MemoryRouter } = require('react-router-dom');
const compiled = await build({ stdin: { contents: `
  export { DeveloperDock } from './src/react/components/DeveloperDock.jsx';
  export { CloudgateProvider } from './src/react/context.jsx';
  export { AuthContext } from './src/react/auth/AuthProvider.jsx';
`, resolveDir: fileURLToPath(new URL('..', import.meta.url)), loader: 'jsx' },
  bundle: true, write: false, format: 'cjs', platform: 'node', packages: 'external', jsx: 'automatic',
  loader: { '.svg': 'dataurl', '.css': 'empty', '.json': 'json' }, logLevel: 'silent' });
const module = { exports: {} };
new Function('require', 'module', 'exports', compiled.outputFiles[0].text)(require, module, module.exports);
const { DeveloperDock, CloudgateProvider, AuthContext } = module.exports;
const h = React.createElement, { act } = React;

function platformError(message, status, body) { return Object.assign(new Error(message), { status, body }); }

async function openDock({ openError, linked }) {
  const client = {
    resolveAppIdentity: async () => ({ webAppId: 'app', environment: 'sbx' }),
    developerWorkspace: { open: async () => { throw openError; }, sdkStatus: async () => ({ updateAvailable: false }) },
    accountLink: { get: async () => ({ linked }) },
  };
  const auth = { currentUser: { user: { id: 1 } } };
  const host = document.createElement('div'); document.body.append(host);
  const root = createRoot(host);
  await act(async () => root.render(h(MemoryRouter, null, h(CloudgateProvider, { client, basePath: '/backoffice' },
    h(AuthContext.Provider, { value: auth }, h(DeveloperDock))))));
  await act(async () => { document.querySelector('.developer-dock').click(); });
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });
  const recovery = document.querySelector('.developer-recovery');
  const view = { kind: recovery?.dataset.kind, text: recovery?.textContent ?? '', buttons: [...(recovery?.querySelectorAll('button') ?? [])].map(b => b.textContent) };
  await act(async () => root.unmount()); host.remove(); document.body.innerHTML = '';
  return view;
}

test('someone who never connected a Cloudgate account is told to connect it, not to reconnect', async () => {
  const view = await openDock({ linked: false, openError: platformError('Link an active Cloudgate account in your profile to open developer mode.', 403, { code: 'developer-link-required' }) });
  assert.equal(view.kind, 'connect');
  assert.match(view.text, /Connect your Cloudgate account/);
  assert.deepEqual(view.buttons, ['Connect Cloudgate account', 'Try again']);
  assert.doesNotMatch(view.text, /Reconnect/);
});

test('a connected account without access sees the reason and that the account is connected', async () => {
  const view = await openDock({ linked: true, openError: platformError('The configured controller is unavailable in this tenant.', 403, { code: 'developer-link-required' }) });
  assert.equal(view.kind, 'access');
  assert.match(view.text, /Your Cloudgate account is connected/);
  assert.match(view.text, /configured controller is unavailable/);
});

test('an app without a configured controller explains the setup and never mentions the account link', async () => {
  for (const openError of [
    Object.assign(new Error('Developer mode is not set up for this app yet. Set VITE_CLOUDGATE_API_PROJECT to ...'), { code: 'developer-controller-required' }),
    platformError('Developer mode is not set up for this app yet. Set VITE_CLOUDGATE_API_PROJECT to ...', 400, { code: 'developer-controller-required' }),
  ]) {
    const view = await openDock({ linked: true, openError });
    assert.equal(view.kind, 'setup');
    assert.match(view.text, /Developer mode is not set up/);
    assert.doesNotMatch(view.text, /linked|Connect your Cloudgate/);
    assert.deepEqual(view.buttons, ['Try again']);
  }
});

test('a server failure is reported as such without blaming the account link', async () => {
  const view = await openDock({ linked: true, openError: platformError('Cloudgate could not complete this request. Please try again.', 500, null) });
  assert.equal(view.kind, 'failed');
  assert.match(view.text, /Developer mode could not open/);
  assert.doesNotMatch(view.text, /linked Cloudgate account|Reconnect/);
});

test('a slow workspace retains its frame while waiting and accepts a late ready message', async () => {
  const originalTimeout = globalThis.setTimeout;
  let expireHandshake;
  globalThis.setTimeout = (callback, delay, ...args) => {
    const timer = originalTimeout(callback, delay, ...args);
    if (delay === 45000) expireHandshake = () => { clearTimeout(timer); callback(); };
    return timer;
  };
  let launches = 0;
  const client = {
    resolveAppIdentity: async () => ({ webAppId: 'app', environment: 'sbx' }),
    developerWorkspace: {
      open: async () => { launches++; return { frameUrl: 'https://hub.test/developer#code=one-use', frameOrigin: 'https://hub.test' }; },
      sdkStatus: async () => ({ updateAvailable: false }),
    },
  };
  const host = document.createElement('div'); document.body.append(host);
  const root = createRoot(host);
  try {
    await act(async () => root.render(h(MemoryRouter, null, h(CloudgateProvider, { client, basePath: '/backoffice' },
      h(AuthContext.Provider, { value: { currentUser: { user: { id: 1 } } } }, h(DeveloperDock))))));
    await act(async () => document.querySelector('.developer-dock').click());
    const frame = document.querySelector('iframe');
    assert.ok(frame);
    await act(async () => expireHandshake());
    assert.equal(document.querySelector('.developer-recovery').dataset.kind, 'slow');
    assert.equal(document.querySelector('iframe'), frame);
    await act(async () => [...document.querySelectorAll('.developer-recovery button')].find(b => b.textContent === 'Keep waiting').click());
    assert.equal(launches, 1);
    assert.equal(document.querySelector('iframe'), frame);
    assert.equal(document.querySelector('.developer-recovery'), null);
    // Even after another slow-load notice, the original session can recover itself.
    await act(async () => expireHandshake());
    await act(async () => window.dispatchEvent(new window.MessageEvent('message', {
      source: frame.contentWindow, origin: 'https://hub.test', data: { source: 'cloudgate-developer', type: 'ready' },
    })));
    assert.equal(document.querySelector('.developer-recovery'), null);
    assert.equal(document.querySelector('.developer-connecting'), null);
    assert.equal(document.querySelector('iframe'), frame);
    assert.equal(launches, 1);
  } finally {
    await act(async () => root.unmount()); host.remove();
    globalThis.setTimeout = originalTimeout;
  }
});
