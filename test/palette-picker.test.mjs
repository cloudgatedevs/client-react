import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { create, act } from 'react-test-renderer';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { DEFAULT_SETTINGS, parseCustomPalette } from '../src/platform/appearance-model.js';

const compiled = await build({ entryPoints: [fileURLToPath(new URL('../src/react/settings/PalettePicker.jsx', import.meta.url))],
  bundle: true, write: false, format: 'cjs', platform: 'node', packages: 'external', jsx: 'automatic', logLevel: 'silent' });
const module = { exports: {} };
new Function('require', 'module', 'exports', compiled.outputFiles[0].text)(createRequire(import.meta.url), module, module.exports);
const { PalettePicker } = module.exports;

test('custom editor retains colours across preset switching and clears invalid drafts on reset', async () => {
  const previousWindow = globalThis.window;
  globalThis.window = { matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }) };
  let values = { ...DEFAULT_SETTINGS }, view;
  function Harness() {
    const [value, setValue] = React.useState(values);
    return React.createElement(React.Fragment, null,
      React.createElement(PalettePicker, { value, onChange: patch => setValue(old => (values = { ...old, ...patch })) }),
      React.createElement('button', { 'aria-label': 'Reset', onClick: () => setValue(values = { ...DEFAULT_SETTINGS }) }));
  }
  const button = label => view.root.find(node => node.type === 'button' && (node.props['aria-label'] === label || node.props.className?.split(' ').includes(label)));
  const hex = () => view.root.findByProps({ 'aria-label': 'Primary hex' });
  try {
    await act(async () => { view = create(React.createElement(Harness)); });
    await act(async () => button('palette-customize').props.onClick());
    await act(async () => hex().props.onChange({ target: { value: '#315d70' } }));
    const custom = parseCustomPalette(values.theme_custom_palette);
    assert.equal(custom.colors.theme_primary, '#315d70');
    await act(async () => button('Citrus & Mint palette').props.onClick());
    assert.equal(values.theme_primary, '#f2cf4a');
    assert.deepEqual(parseCustomPalette(values.theme_custom_palette), custom);
    await act(async () => button('Custom palette: My palette').props.onClick());
    assert.equal(hex().props.value, '#315d70');
    await act(async () => hex().props.onChange({ target: { value: '#' } }));
    await act(async () => button('Reset').props.onClick());
    assert.equal(view.root.findAllByProps({ 'aria-label': 'Primary hex' }).length, 0);
    assert.equal(values.theme_primary, DEFAULT_SETTINGS.theme_primary);
  } finally {
    if (view) await act(async () => view.unmount());
    if (previousWindow === undefined) delete globalThis.window; else globalThis.window = previousWindow;
  }
});
