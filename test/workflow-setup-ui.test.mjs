import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { JSDOM } from 'jsdom';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/backoffice' });
for (const key of ['window', 'document', 'HTMLElement', 'HTMLInputElement', 'Node', 'NodeFilter', 'MutationObserver', 'CustomEvent', 'getComputedStyle'])
  globalThis[key] = dom.window[key];
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const require = createRequire(import.meta.url);
const { createRoot } = require('react-dom/client');
const { MemoryRouter } = require('react-router-dom');
const compiled = await build({ stdin: { contents: `
  export { WorkflowSetupNotice } from './src/react/components/WorkflowSetupNotice.jsx';
  export { CloudgateProvider } from './src/react/context.jsx';
  export { AuthContext } from './src/react/auth/AuthProvider.jsx';
`, resolveDir: fileURLToPath(new URL('..', import.meta.url)), loader: 'jsx' },
  bundle: true, write: false, format: 'cjs', platform: 'node', packages: 'external', jsx: 'automatic',
  loader: { '.svg': 'dataurl', '.css': 'empty' }, logLevel: 'silent' });
const module = { exports: {} };
new Function('require', 'module', 'exports', compiled.outputFiles[0].text)(require, module, module.exports);
const { WorkflowSetupNotice, CloudgateProvider, AuthContext } = module.exports;
const h = React.createElement, { act } = React;
const metadata = { id: 'shop', name: 'Shop', workflows: { file: '.template/workflows.json' } };
const missing = { appId: 'shop', environment: 'sbx', projectPath: 'shop', catalogVersion: '1',
  status: 'missing', revision: 'a'.repeat(64), canApply: true, workflows: [{ name: 'Catalog', route: 'catalog', state: 'missing' }] };
const button = label => [...document.querySelectorAll('button')].find(node => node.textContent === label);
async function mount(workflowSetup, appMetadata = metadata) {
  const client = { workflowSetup, resolveAppIdentity: async () => ({ webAppId: 'app', environment: 'sbx' }) };
  const host = document.createElement('div'); document.body.append(host); const root = createRoot(host);
  const render = async value => { await act(async () => root.render(h(MemoryRouter, { future: { v7_startTransition: true, v7_relativeSplatPath: true } },
    h(CloudgateProvider, { client, metadata: value, basePath: '/backoffice' },
      h(AuthContext.Provider, { value: { currentUser: { user: { id: 1 } } } }, h(WorkflowSetupNotice)))))); };
  await render(appMetadata);
  return { render, close: async () => { await act(async () => root.unmount()); host.remove(); } };
}

test('missing workflows offer review; importing needs confirmation and refreshes readiness', async () => {
  let current = missing; const calls = [];
  const view = await mount({ status: async () => current, apply: async (...args) => {
    calls.push(args); current = { ...missing, status: 'ready', controllerId: 'controller', workflows: [{ ...missing.workflows[0], state: 'ready' }] };
    return { projectPath: 'shop', publishedWorkflowCount: 1, warnings: [] };
  } });
  try {
    assert.match(document.body.textContent, /workflows are not ready/);
    await act(async () => button('Set up workflows').click());
    assert.equal(button('Import workflows').disabled, true);
    assert.match(document.querySelector('[role="dialog"]').textContent, /CatalogMissing/);
    await act(async () => document.querySelector('input[type="checkbox"]').click());
    assert.equal(button('Import workflows').disabled, false);
    await act(async () => button('Import workflows').click());
    assert.deepEqual(calls, [[metadata, { revision: missing.revision, confirmOverwrite: true }]]);
    assert.match(document.body.textContent, /1 workflows published to sandbox/);
    assert.equal(document.querySelector('input[type="checkbox"]').checked, false);
    assert.equal(button('Update workflows').disabled, true);
  } finally { await view.close(); }
});

test('permission and network errors offer recovery, never a missing-workflows diagnosis or enabled import', async () => {
  for (const error of [Object.assign(new Error('Account not linked'), { status: 403 }), new Error('Network down')]) {
    const view = await mount({ status: async () => { throw error; }, apply: () => assert.fail('Must not import') });
    try {
      assert.ok(!document.body.textContent.includes('workflows are not ready'));
      await act(async () => button('Manage workflows').click());
      assert.equal(button('Import workflows').disabled, true);
      assert.equal(document.querySelector('a').getAttribute('href'), '/backoffice/profile');
      assert.match(document.querySelector('[role="alert"]').textContent, error.status === 403 ? /Connect your Cloudgate account/ : /Network down/);
    } finally { await view.close(); }
  }
});

test('a failed import invalidates its review until another check succeeds', async () => {
  const view = await mount({ status: async () => missing, apply: async () => { throw new Error('The controller changed'); } });
  try {
    await act(async () => button('Set up workflows').click());
    await act(async () => document.querySelector('input[type="checkbox"]').click());
    await act(async () => button('Import workflows').click());
    assert.match(document.querySelector('[role="alert"]').textContent, /Check the current status before retrying/);
    assert.equal(button('Import workflows').disabled, true);
    assert.equal(document.querySelector('input[type="checkbox"]'), null);
    await act(async () => button('Check again').click());
    assert.equal(document.querySelector('input[type="checkbox"]').checked, false);
  } finally { await view.close(); }
});

test('apps without workflow metadata do not check or show setup controls', async () => {
  const view = await mount({ status: () => assert.fail('Must not check') }, { name: 'Plain app' });
  try { assert.equal(document.querySelector('[aria-label="App workflows"]'), null); }
  finally { await view.close(); }
});
