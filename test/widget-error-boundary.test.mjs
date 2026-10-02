import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { JSDOM } from 'jsdom';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost' });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const require = createRequire(import.meta.url);
const { createRoot } = require('react-dom/client');
const { act } = React, h = React.createElement;

async function load(file) {
  const compiled = await build({ entryPoints: [fileURLToPath(new URL(file, import.meta.url))],
    bundle: true, write: false, format: 'cjs', platform: 'node', packages: 'external', jsx: 'automatic', logLevel: 'silent' });
  const module = { exports: {} };
  new Function('require', 'module', 'exports', compiled.outputFiles[0].text)(require, module, module.exports);
  return module.exports;
}
const { ErrorBoundary } = await load('../src/react/widgets/ErrorBoundary.jsx');
const { DataTable } = await load('../src/react/widgets/DataTable.jsx');

async function mount(element) {
  const host = document.createElement('div'); document.body.append(host);
  const root = createRoot(host);
  const render = async next => act(async () => root.render(next));
  await render(element);
  return { host, render, close: async () => { await act(async () => root.unmount()); host.remove(); } };
}
const click = async node => act(async () => node.click());
// React logs caught render errors; keep the test output readable without hiding real failures.
async function quietly(run) {
  const original = console.error; console.error = () => {};
  const swallow = event => event.preventDefault(); window.addEventListener('error', swallow);
  try { return await run(); } finally { console.error = original; window.removeEventListener('error', swallow); }
}

test('a render error stays inside the boundary, can be retried and clears when the reset key changes', async () => quietly(async () => {
  let broken = true; const seen = [];
  const Section = () => { if (broken) throw new Error('identity is not a function'); return h('p', null, 'Receivers'); };
  const tree = key => h('div', null, h('nav', null, 'Navigation'),
    h(ErrorBoundary, { resetKey: key, title: 'These details could not be displayed', onError: error => seen.push(error.message) }, h(Section)));
  const view = await mount(tree('a'));
  try {
    assert.equal(view.host.querySelector('nav').textContent, 'Navigation');
    const alert = view.host.querySelector('[role="alert"]');
    assert.match(alert.textContent, /These details could not be displayed/);
    assert.deepEqual(seen, ['identity is not a function']);
    // Retrying while the defect is still there shows the alert again rather than crashing.
    await click([...view.host.querySelectorAll('button')].find(node => node.textContent === 'Try again'));
    assert.ok(view.host.querySelector('[role="alert"]'));
    broken = false;
    await click([...view.host.querySelectorAll('button')].find(node => node.textContent === 'Try again'));
    assert.equal(view.host.querySelector('p').textContent, 'Receivers');
    broken = true; await view.render(tree('a'));
    assert.ok(view.host.querySelector('[role="alert"]'));
    broken = false; await view.render(tree('b'));
    assert.equal(view.host.querySelector('[role="alert"]'), null);
  } finally { await view.close(); }
}));

test('a broken expanded row leaves the table and the other rows usable', async () => quietly(async () => {
  const rows = [{ id: 1, name: 'Broken' }, { id: 2, name: 'Fine' }];
  const Detail = ({ row }) => { if (row.id === 1) throw new Error('boom'); return h('p', null, 'Details of ' + row.name); };
  const view = await mount(h(DataTable, { rows, columns: [{ key: 'name', label: 'Name' }], exportable: false, getRowLabel: row => row.name,
    renderExpandedRow: row => h(Detail, { row }) }));
  try {
    const expand = name => [...view.host.querySelectorAll('.cgw-table-expand-button')].find(node => node.getAttribute('aria-label')?.includes(name));
    await click(expand('Broken'));
    assert.match(view.host.querySelector('.cgw-table-detail').textContent, /These details could not be displayed/);
    assert.equal(view.host.querySelectorAll('tbody > tr:not(.cgw-table-detail-row)').length, 2);
    await click(expand('Fine'));
    assert.ok([...view.host.querySelectorAll('.cgw-table-detail')].some(node => node.textContent === 'Details of Fine'));
  } finally { await view.close(); }
}));

test('the back-office layout wraps every routed page in a boundary keyed by the route', () => {
  const layout = readFileSync(new URL('../src/react/components/Layout.jsx', import.meta.url), 'utf8');
  assert.match(layout, /<ErrorBoundary resetKey=\{location\.pathname\}[^>]*>\s*<RequirePagePermission><Outlet \/><\/RequirePagePermission>\s*<\/ErrorBoundary>/);
});
