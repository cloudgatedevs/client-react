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
const { DataTable } = await load('../src/react/widgets/DataTable.jsx');
const { Disclosure } = await load('../src/react/widgets/primitives.jsx');
const css = readFileSync(new URL('../src/react/widgets/widgets.css', import.meta.url), 'utf8');

async function mount(element) {
  const host = document.createElement('div'); document.body.append(host);
  const root = createRoot(host);
  const render = async next => act(async () => root.render(next));
  await render(element);
  return { host, render, close: async () => { await act(async () => root.unmount()); host.remove(); } };
}
const click = async node => act(async () => node.click());

test('density is opt-in: only compact adds the modifier class, and sub tables are compact through CSS', async () => {
  const props = { rows: [{ id: 1, name: 'Alex' }], columns: [{ key: 'name', label: 'Name' }], exportable: false };
  const normal = await mount(h(DataTable, props));
  const compact = await mount(h(DataTable, { ...props, density: 'compact', className: 'mine' }));
  try {
    assert.equal(normal.host.querySelector('section').className.trim(), 'cgw-table');
    assert.deepEqual([...compact.host.querySelector('section').classList], ['cgw-table', 'cgw-table--compact', 'mine']);
    // One rule serves the prop and nested tables, so an expanded row never needs application CSS.
    assert.match(css, /\.cgw-table--compact,\s*\.cgw-table-detail \.cgw-table \{\s*--cgw-cell-padding: 0\.3rem 0\.6rem;/);
  } finally { await normal.close(); await compact.close(); }
});

test('anchors in cells are links and labelled toolbar fields are inline without application styles', () => {
  assert.match(css, /\.cgw-table-scroll :where\(tbody td\) a:where\(:not\(\.cgw-button, \.cgw-icon-button\)\) \{\s*color: rgb\(var\(--accent-text\)\);\s*text-decoration: underline;/);
  assert.match(css, /\.cgw-table-tools > \.cgw-field:has\(> label\) \{[^}]*flex-direction: row;/);
  // The palette tokens are bare RGB triplets: a colour written without rgb() would silently be dropped.
  const added = css.slice(css.indexOf('/* Compact density'));
  assert.equal(/:\s*var\(--(accent|ink|mist)/.test(added), false);
});

test('a disclosure mounts its content on first open, keeps it afterwards and exposes its state', async () => {
  let mounts = 0;
  function Body() { React.useEffect(() => { mounts++; }, []); return h('p', null, 'Loaded content'); }
  const calls = [];
  const view = await mount(h(Disclosure, { title: 'History coverage', subtitle: '3 wallets', onOpenChange: open => calls.push(open),
    actions: h('button', { type: 'button' }, 'Refresh') }, h(Body)));
  try {
    const trigger = view.host.querySelector('.cgw-disclosure-trigger'), panel = view.host.querySelector('[role="region"]');
    assert.equal(trigger.getAttribute('aria-expanded'), 'false');
    assert.equal(panel.hidden, true); assert.equal(mounts, 0); assert.equal(panel.textContent, '');
    assert.equal(trigger.getAttribute('aria-controls'), panel.id);
    assert.equal(panel.getAttribute('aria-labelledby'), trigger.id);
    // The action is not nested inside the toggle button.
    assert.equal(trigger.contains(view.host.querySelector('.cgw-disclosure-actions')), false);
    await click(trigger);
    assert.equal(trigger.getAttribute('aria-expanded'), 'true'); assert.equal(panel.hidden, false); assert.equal(mounts, 1);
    await click(trigger);
    assert.equal(panel.hidden, true); assert.equal(panel.textContent, 'Loaded content');
    await click(trigger);
    assert.equal(mounts, 1);
    assert.deepEqual(calls, [true, false, true]);
  } finally { await view.close(); }
});

test('a controlled disclosure follows its prop, and lazy can be turned off', async () => {
  const calls = [];
  const view = await mount(h(Disclosure, { title: 'Details', open: false, lazy: false, onOpenChange: open => calls.push(open) }, 'Always mounted'));
  try {
    const trigger = view.host.querySelector('.cgw-disclosure-trigger'), panel = view.host.querySelector('[role="region"]');
    assert.equal(panel.textContent, 'Always mounted'); assert.equal(panel.hidden, true);
    await click(trigger);
    assert.deepEqual(calls, [true]); assert.equal(panel.hidden, true);
    await view.render(h(Disclosure, { title: 'Details', open: true, lazy: false }, 'Always mounted'));
    assert.equal(view.host.querySelector('[role="region"]').hidden, false);
    assert.equal(view.host.querySelector('section').classList.contains('cgw-disclosure--open'), true);
  } finally { await view.close(); }
});

test('a labelled ghost button has an outline and an icon-only one stays bare', () => {
  assert.match(css, /\.cgw-button--ghost:not\(\.cgw-icon-button\) \{\s*border-color: rgb\(var\(--ink-600\)\);/);
  // The base button reserves the border, so adding the colour does not change any button's size.
  assert.match(css, /\.cgw-button \{[^}]*border: 1px solid transparent;/);
});

test('disclosures that follow each other keep a gap, and a Stack uses its own gap', () => {
  assert.match(css, /:where\(\.cgw-disclosure\) \+ :where\(\.cgw-disclosure\) \{ margin-top: 0\.75rem; \}/);
  assert.match(css, /\.cgw-stack > \.cgw-disclosure \{ margin-top: 0; \}/);
});
