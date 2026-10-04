import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { JSDOM } from 'jsdom';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/backoffice' });
for (const key of ['window', 'document', 'HTMLElement', 'HTMLInputElement', 'Element', 'Node', 'NodeFilter', 'MutationObserver', 'CustomEvent'])
  globalThis[key] = key === 'window' ? dom.window : key === 'document' ? dom.window.document : dom.window[key];
globalThis.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
const require = createRequire(import.meta.url);
const { createRoot } = require('react-dom/client');
const compiled = await build({ stdin: { contents: `
  export { AgentWatchDialog } from './src/react/agents/AgentWatchDialog.jsx';
  export { AgentsProvider, useAgents } from './src/react/agents/AgentsProvider.jsx';
  export { CloudgateProvider } from './src/react/context.jsx';
  export { AuthContext } from './src/react/auth/AuthProvider.jsx';
`, resolveDir: fileURLToPath(new URL('..', import.meta.url)), loader: 'jsx' },
  bundle: true, write: false, format: 'cjs', platform: 'node', packages: 'external', jsx: 'automatic', logLevel: 'silent' });
const module = { exports: {} };
new Function('require', 'module', 'exports', compiled.outputFiles[0].text)(require, module, module.exports);
const { AgentWatchDialog, AgentsProvider, useAgents, CloudgateProvider, AuthContext } = module.exports;
const h = React.createElement, { act } = React;
const agent = { id: 'agent', name: 'Watcher', canRunWorkflows: true };
const unrelated = { endpointId: 'chains', name: 'Blockchains', route: 'blockchains', method: 'GET' };
const matched = { endpointId: 'transactions', name: 'Transactions', route: 'transactions', method: 'GET' };

async function mount(t, { workflows = [unrelated], resolved = [unrelated], resolveError } = {}) {
  const writes = [];
  let context;
  function Probe() { context = useAgents(); return h(AgentWatchDialog); }
  const client = {
    resolveAppIdentity: async () => ({ environment: 'sbx' }),
    agents: {
      overview: async () => ({ agents: [agent], canApprove: true }),
      attention: async () => ({ items: [] }),
      watchResolve: async () => {
        if (resolveError) throw new Error(resolveError);
        return { items: [{ key: 'route', workflows: resolved }] };
      },
      watchWorkflows: async () => ({ items: workflows }),
      watchSet: async payload => { writes.push(payload); return {}; },
      watchScheduleSet: async payload => { writes.push(payload); return {}; },
    },
  };
  const host = document.createElement('div'); document.body.append(host);
  const root = createRoot(host);
  t.after(async () => { await act(async () => root.unmount()); host.remove(); });
  await act(async () => root.render(h(CloudgateProvider, { client },
    h(AuthContext.Provider, { value: { currentUser: { user: { id: 1, rolePermissions: [
      { key: 'backoffice.access', value: true }, { key: 'backoffice.agents.access', value: true },
    ] } } } }, h(AgentsProvider, null, h(Probe))))));
  return {
    writes,
    open: async ({ label = 'Weather', auto = { label, kind: 'data', context: '/dashboard' }, ...options } = {}) => {
      await act(async () => context.openWatch({ agent, targets: [{ key: 'route', path: 'route' }], label, auto, ...options }));
    },
  };
}

const saveButton = () => document.querySelector('.cg-watch-foot .btn-primary');

for (const resolved of [[], [unrelated]]) test(`an unmatched widget cannot fall back to ${resolved.length ? 'another workflow called by the page' : 'the first workflow in the app'}`, async t => {
  const view = await mount(t, { resolved });
  await view.open();
  assert.match(document.querySelector('[role="alert"]')?.textContent || '', /No workflow available/);
  assert.equal(document.querySelector('.cg-watch-form select'), null);
  assert.equal(document.querySelector('.cg-watch-form textarea'), null);
  assert.equal(saveButton().disabled, true);
  await act(async () => saveButton().click());
  assert.deepEqual(view.writes, []);
});

test('a widget selects a matching workflow instead of an unrelated page call and clears it for the next unmatched drop', async t => {
  const view = await mount(t, { workflows: [unrelated, matched] });
  await view.open({ label: 'Transactions' });
  assert.equal(document.querySelector('[role="alert"]'), null);
  assert.match(document.querySelector('.cg-watch-route').textContent, /Transactions/);
  assert.doesNotMatch(document.querySelector('.cg-watch-form').textContent, /Blockchains/);
  assert.equal(saveButton().disabled, false);
  assert.equal(saveButton().textContent, 'Save schedule');
  await view.open();
  assert.equal(saveButton().disabled, true);
  assert.equal(document.querySelector('.cg-watch-form textarea'), null);
  assert.match(document.querySelector('[role="alert"]').textContent, /No workflow available/);
  assert.deepEqual(view.writes, []);
});

test('an explicitly resolved widget route still works when its label differs from the workflow name', async t => {
  const view = await mount(t, { resolved: [matched] });
  // Passing null disables automatic matching, just as a declared data-cg-feed does.
  await view.open({ label: 'Ledger activity', auto: null });
  assert.match(document.querySelector('.cg-watch-route').textContent, /Transactions/);
  assert.equal(saveButton().disabled, false);
  assert.equal(document.querySelector('[role="alert"]'), null);
});

test('a failed workflow lookup reports its error and cannot save', async t => {
  const view = await mount(t, { resolveError: 'Workflow lookup unavailable' });
  await view.open();
  assert.equal(document.querySelector('[role="alert"]').textContent, 'Workflow lookup unavailable');
  assert.equal(saveButton().disabled, true);
  assert.deepEqual(view.writes, []);
});
