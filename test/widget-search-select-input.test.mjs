import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { JSDOM } from 'jsdom';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost' });
for (const key of ['window', 'document', 'HTMLElement', 'Element', 'Node', 'NodeFilter', 'MutationObserver', 'CustomEvent', 'HTMLInputElement', 'HTMLButtonElement'])
  globalThis[key] = key === 'window' ? dom.window : key === 'document' ? dom.window.document : dom.window[key];
globalThis.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
const require = createRequire(import.meta.url);
const { createRoot } = require('react-dom/client');
const { act } = React;
const compiled = await build({ stdin: {
  contents: "export {SearchSelect} from './src/react/widgets/SearchSelect.jsx'; export {Dialog} from './src/react/widgets/primitives.jsx';",
  resolveDir: fileURLToPath(new URL('..', import.meta.url)), loader: 'jsx',
}, bundle: true, write: false, format: 'cjs', platform: 'node', packages: 'external', jsx: 'automatic', logLevel: 'silent' });
const module = { exports: {} };
new Function('require', 'module', 'exports', compiled.outputFiles[0].text)(require, module, module.exports);
const { SearchSelect, Dialog } = module.exports;
const h = React.createElement;
const selected = { value: 'original', label: 'Original customer' };
const options = [selected, { value: 'leon', label: 'Leon', description: 'leon@example.com' }];
const nativeValue = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
const tick = () => act(async () => new Promise(resolve => setTimeout(resolve, 20)));

async function edit(input, text, inputType = 'insertText') {
  await act(async () => {
    nativeValue.call(input, text);
    input.dispatchEvent(new window.InputEvent('input', { bubbles: true, inputType }));
  });
}

async function type(input, text) {
  for (const character of text) {
    // Read the real value and selection for each keystroke; do not restore an
    // intended draft with a second change event that can hide dropped input.
    const next = input.value.slice(0, input.selectionStart) + character + input.value.slice(input.selectionEnd);
    await edit(input, next);
    assert.equal(input.value, next, 'Every keystroke must survive a parent render');
    assert.equal(document.activeElement, input, 'Typing must retain focus');
  }
}

async function mount({ controlled = true, ...props } = {}) {
  const changes = [], queries = [];
  function Example() {
    const [value, setValue] = React.useState(selected.value);
    const [query, setQuery] = React.useState('');
    return h(Dialog, { open: true, title: 'Move account', onClose() {} },
      h(SearchSelect, {
        label: 'Destination', name: 'destination', required: true, options, selectedOption: selected,
        ...(controlled ? { value } : { defaultValue: selected.value }),
        ...props,
        onChange: (next, option) => { changes.push([next, option]); setValue(next); },
        onSearchChange: next => { queries.push(next); setQuery(next); },
      }), h('output', { 'data-query': true }, query));
  }
  const host = document.createElement('div'); document.body.append(host);
  const root = createRoot(host);
  await act(async () => root.render(h(Example)));
  const input = document.querySelector('[role="combobox"]');
  await act(async () => input.focus());
  return { input, changes, queries, close: async () => { await act(async () => root.unmount()); host.remove(); } };
}

for (const controlled of [true, false]) {
  test(`${controlled ? 'controlled' : 'uncontrolled'} destination edit preserves text and invalidates the old ID immediately`, async () => {
    const view = await mount({ controlled, clearSelectionOnSearch: true });
    try {
      await type(view.input, 'L');
      assert.deepEqual(view.changes, [['', null]]);
      assert.equal(document.querySelector('input[type="hidden"]').value, '');
      let valid;
      await act(async () => { valid = view.input.checkValidity(); });
      assert.equal(valid, false, 'Free text must not remain a valid destination');
      await type(view.input, 'eon');
      assert.equal(view.input.value, 'Leon');
      assert.deepEqual(view.queries, ['L', 'Le', 'Leo', 'Leon']);
      assert.equal(view.changes.length, 1, 'Clear only the previously committed selection');
      assert.equal(document.querySelector('[role="combobox"]'), view.input, 'Do not remount the input');
      await edit(view.input, 'Leo', 'deleteContentBackward');
      await edit(view.input, '', 'deleteContentBackward');
      await type(view.input, 'Leon');
      const option = [...document.querySelectorAll('[role="option"]')].find(el => el.textContent.includes('Leon'));
      await act(async () => option.click());
      assert.equal(document.querySelector('input[type="hidden"]').value, 'leon');
      await act(async () => { valid = view.input.checkValidity(); });
      assert.equal(valid, true);
      view.input.setSelectionRange(0, view.input.value.length);
      await type(view.input, 'N');
      assert.equal(view.input.value, 'N');
      assert.equal(document.querySelector('input[type="hidden"]').value, '');
      assert.deepEqual(view.changes.at(-1), ['', null]);
    } finally { await view.close(); }
  });
}

test('default behavior still restores the committed selection on Escape', async () => {
  const view = await mount();
  try {
    await type(view.input, 'Leon');
    assert.equal(document.querySelector('input[type="hidden"]').value, 'original');
    assert.deepEqual(view.changes, []);
    await act(async () => view.input.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    assert.equal(view.input.value, 'Original customer');
    assert.equal(view.input.getAttribute('aria-expanded'), 'false');
    assert.deepEqual(view.queries, ['L', 'Le', 'Leo', 'Leon']);
  } finally { await view.close(); }
});

test('typing continues during remote requests and ignores stale results inside a dialog', async () => {
  const requests = [];
  const view = await mount({ clearSelectionOnSearch: true, debounceMs: 0,
    loadOptions: query => new Promise(resolve => requests.push({ ...query, resolve })),
  });
  try {
    await type(view.input, 'L');
    await tick();
    const first = requests.find(request => request.search === 'L');
    assert.ok(first);
    await type(view.input, 'eon');
    assert.equal(first.signal.aborted, true);
    await tick();
    const latest = requests.find(request => request.search === 'Leon');
    await act(async () => latest.resolve([options[1]]));
    await act(async () => first.resolve([{ value: 'stale', label: 'Stale result' }]));
    assert.equal(view.input.value, 'Leon');
    assert.equal(document.activeElement, view.input);
    assert.equal(document.querySelector('[role="listbox"]').textContent, 'Leonleon@example.com');
    await type(view.input, 'a');
    assert.equal(view.input.value, 'Leona');
    assert.equal(document.querySelector('[role="listbox"]').textContent, '');
  } finally { await view.close(); }
});
