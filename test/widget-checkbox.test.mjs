import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { JSDOM } from 'jsdom';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost' });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const require = createRequire(import.meta.url);
const { createRoot } = require('react-dom/client');
const { act, createElement: h } = React;
const compiled = await build({
  entryPoints: [fileURLToPath(new URL('../src/react/widgets/primitives.jsx', import.meta.url))],
  bundle: true, write: false, format: 'cjs', platform: 'node', packages: 'external', jsx: 'automatic', logLevel: 'silent',
});
const module = { exports: {} };
new Function('require', 'module', 'exports', compiled.outputFiles[0].text)(require, module, module.exports);
const { Checkbox } = module.exports;

async function mount(props) {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  await act(async () => root.render(h(Checkbox, props)));
  return { host, close: async () => { await act(async () => root.unmount()); host.remove(); } };
}

test('the visible checkbox label toggles the native input and disabled labels cannot toggle it', async () => {
  const changes = [];
  const view = await mount({ label: 'Confirm the transaction on the sandbox chain', hint: 'Check the details first.', onChange: e => changes.push(e.target.checked) });
  const disabled = await mount({ label: 'Disabled confirmation', disabled: true, onChange: () => changes.push('disabled') });
  try {
    const input = view.host.querySelector('input');
    assert.equal(input.labels.length, 1);
    assert.match(input.labels[0].textContent, /Confirm the transaction/);
    await act(async () => view.host.querySelector('.cgw-check > span').click());
    assert.equal(input.checked, true);
    assert.deepEqual(changes, [true]);
    await act(async () => disabled.host.querySelector('.cgw-check > span').click());
    assert.deepEqual(changes, [true]);
  } finally { await view.close(); await disabled.close(); }
});

test('standalone selection checkboxes retain their accessible name, ref and indeterminate state without an empty label column', async () => {
  const ref = React.createRef();
  const view = await mount({ 'aria-label': 'Select all rows', indeterminate: true, ref });
  try {
    const input = view.host.querySelector('input');
    assert.equal(input.getAttribute('aria-label'), 'Select all rows');
    assert.equal(input.getAttribute('aria-checked'), 'mixed');
    assert.equal(input.indeterminate, true);
    assert.equal(ref.current, input);
    assert.equal(view.host.querySelector('.cgw-check').children.length, 1);
  } finally { await view.close(); }
});
