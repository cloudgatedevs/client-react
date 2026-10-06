import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { JSDOM } from 'jsdom';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { watchElementKey } from '../src/platform/agent-watch.js';

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

async function mount(t, { workflows = [unrelated], resolved = [unrelated], resolveError, supportsRequestGroups = true, requestItems } = {}) {
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
        return { supportsRequestGroups, items: requestItems || [{ key: 'route', workflows: resolved }] };
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
  if (resolved.length) {
    assert.equal(document.querySelector('.cg-watch-form select').value, '');
    assert.match(document.querySelector('.cg-watch-form').textContent, /Choose its workflow/);
  } else assert.match(document.querySelector('[role="alert"]')?.textContent || '', /No workflow available/);
  assert.equal(document.querySelector('.cg-watch-form textarea'), null);
  assert.equal(saveButton().disabled, true);
  await act(async () => saveButton().click());
  assert.deepEqual(view.writes, []);
});

test('a widget selects a matching workflow instead of an unrelated page call and clears it for the next unmatched drop', async t => {
  const view = await mount(t, { workflows: [unrelated, matched] });
  await view.open({ label: 'Transactions' });
  assert.equal(document.querySelector('[role="alert"]'), null);
  assert.equal(document.querySelector('.cg-watch-form select').value, matched.endpointId);
  assert.equal(saveButton().disabled, false);
  assert.equal(saveButton().textContent, 'Save schedule');
  await view.open();
  assert.equal(saveButton().disabled, true);
  assert.equal(document.querySelector('.cg-watch-form textarea'), null);
  assert.equal(document.querySelector('.cg-watch-form select').value, '');
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

const change = async (element, value) => act(async () => {
  const prototype = element.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLSelectElement.prototype;
  Object.getOwnPropertyDescriptor(prototype, 'value').set.call(element, value);
  element.dispatchEvent(new window.Event(element.tagName === 'TEXTAREA' ? 'input' : 'change', { bubbles: true }));
});

test('an aggregate widget can choose eight inputs of one workflow and save one grouped check', async t => {
  const workflow = { endpointId: 'warnings', name: 'Browser warning count', route: 'admin/warnings/${segment}', method: 'GET' };
  const targets = ['transactions', 'payments', 'deposits', 'withdrawal', 'kyc', 'merchants', 'markets', 'holding']
    .map(segment => ({ key: segment, path: `admin/warnings/${segment}`, url: `admin/warnings/${segment}?app=one` }));
  const view = await mount(t, { workflows: [workflow], requestItems: targets.map(target => ({ key: target.key, workflows: [workflow] })) });
  await view.open({ label: 'Items needing attention', targets });
  assert.equal(saveButton().disabled, true, 'an ambiguous source is not silently chosen');
  await change(document.querySelector('.cg-watch-field select'), 'warnings');
  assert.equal(document.querySelectorAll('.cg-watch-requests input').length, 8);
  assert.equal(saveButton().disabled, true, 'multiple inputs require a choice');
  await act(async () => [...document.querySelectorAll('button')].find(button => button.textContent.trim() === 'Select all requests').click());
  await change(document.querySelector('textarea'), 'Alert when the sum of the eight counts exceeds 100.');
  await act(async () => saveButton().click());
  assert.equal(view.writes.length, 1);
  assert.deepEqual(view.writes[0].sampleUrls, targets.map(target => target.url));
  assert.equal(view.writes[0].widgetKey, '/dashboard::Items needing attention');
  assert.equal(view.writes[0].prompt, 'Alert when the sum of the eight counts exceeds 100.');
});

test('widgets sharing a response keep their own instructions and selected inputs', async t => {
  const workflow = { ...matched, schedules: [{ id: 'existing', agentId: agent.id, widgetKey: '/dashboard::Transactions',
    prompt: 'Only check transactions.total', intervalMinutes: 60, sampleUrls: ['transactions?app=old'], isProduction: false }] };
  const view = await mount(t, { workflows: [workflow], resolved: [workflow] });
  await view.open({ label: 'Transactions', targets: [{ key: 'route', path: 'transactions', url: 'transactions?app=new' }] });
  assert.equal(document.querySelector('textarea').value, 'Only check transactions.total');
  assert.equal(document.querySelectorAll('.cg-watch-requests input:checked').length, 1);
  assert.match(document.querySelector('.cg-watch-requests input:checked').parentElement.textContent, /app=old/);
  const newInput = [...document.querySelectorAll('.cg-watch-requests input')].find(input => input.parentElement.textContent.includes('app=new'));
  await act(async () => { document.querySelector('.cg-watch-requests input:checked').click(); newInput.click(); });
  await act(async () => saveButton().click());
  assert.equal(view.writes[0].id, 'existing');
  assert.deepEqual(view.writes[0].sampleUrls, ['transactions?app=new']);
  await view.open({ label: 'Transactions total paid' });
  assert.equal(document.querySelector('textarea').value, '', 'a different widget must not overwrite the existing check');
  assert.equal([...document.querySelectorAll('button')].some(button => button.textContent === 'Stop checking'), false);
});

test('an older server cannot silently drop grouped inputs', async t => {
  const view = await mount(t, { resolved: [matched], supportsRequestGroups: false });
  await view.open({ label: 'Transactions', auto: null });
  assert.match(document.querySelector('[role="alert"]').textContent, /server needs an update/);
  assert.equal(saveButton().disabled, true);
  assert.deepEqual(view.writes, []);
});

test('editing a particular saved check does not pick the first schedule on a shared workflow', async t => {
  const workflow = { ...matched, schedules: ['one', 'two'].map(id => ({ id, agentId: agent.id, prompt: `Check ${id}`, intervalMinutes: 60, isProduction: false })) };
  const view = await mount(t, { resolved: [workflow] });
  await view.open({ auto: null, endpointId: matched.endpointId, scheduleId: 'two', mode: 'schedule' });
  assert.equal(document.querySelector('textarea').value, 'Check two');
  await act(async () => saveButton().click());
  assert.equal(view.writes[0].id, 'two');
});


test('equally labelled widgets have distinct keys that ignore changing counts', () => {
  const main = document.createElement('main'); main.id = 'main-content';
  main.innerHTML = '<section><article>Total <b>12</b></article><article>Total <b>34</b></article></section>';
  const [first, second] = main.querySelectorAll('article');
  const key = watchElementKey(first, '/dashboard', 'Total');
  assert.notEqual(key, watchElementKey(second, '/dashboard', 'Total'));
  first.querySelector('b').textContent = '99';
  assert.equal(key, watchElementKey(first, '/dashboard', 'Total'));
});

test('editing a check in the other environment cannot create a replacement in the current environment', async t => {
  const workflow = { ...matched, schedules: [{ id: 'prod', agentId: agent.id, prompt: 'Check production', isProduction: true, intervalMinutes: 60 }] };
  const view = await mount(t, { resolved: [workflow] });
  await view.open({ auto: null, endpointId: matched.endpointId, scheduleId: 'prod', mode: 'schedule' });
  assert.equal(document.querySelector('textarea').value, 'Check production');
  assert.match(document.querySelector('[role="alert"]').textContent, /Open this app in Production/);
  assert.equal(saveButton().disabled, true);
  assert.deepEqual(view.writes, []);
});
