import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { create, act } from 'react-test-renderer';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { DEFAULT_SETTINGS, fontVariables } from '../src/platform/appearance-model.js';
const compiled = await build({ entryPoints: [fileURLToPath(new URL('../src/react/settings/FontPicker.jsx', import.meta.url))],
  bundle: true, write: false, format: 'cjs', platform: 'node', packages: 'external', jsx: 'automatic' });
const module = { exports: {} };
new Function('require', 'module', 'exports', compiled.outputFiles[0].text)(createRequire(import.meta.url), module, module.exports);
const { FontPicker } = module.exports;

test('font drafts preview independently and reset to saved values', async () => {
  let view, draft;
  const saved = { ...DEFAULT_SETTINGS, theme_font_body: 'dm-sans', theme_font_heading: 'lora' };
  function Harness() {
    const [value, setValue] = React.useState(saved);
    draft = value;
    return React.createElement(React.Fragment, null,
      React.createElement(FontPicker, { value, onChange: patch => setValue(old => ({ ...old, ...patch })) }),
      React.createElement('div', { 'data-preview': true, style: fontVariables(value) }),
      React.createElement('button', { onClick: () => setValue(saved) }, 'Reset'));
  }
  try {
    await act(async () => { view = create(React.createElement(Harness)); });
    const [body, heading] = view.root.findAllByType('select');
    assert.equal(body.findAllByType('option').length, 15);
    assert.equal(heading.findAllByType('option').length, 16);
    await act(async () => body.props.onChange({ target: { value: 'manrope' } }));
    assert.equal(draft.theme_font_heading, 'lora');
    assert.equal(saved.theme_font_body, 'dm-sans');
    await act(async () => heading.props.onChange({ target: { value: 'inherit' } }));
    const preview = view.root.findByProps({ 'data-preview': true }).props.style;
    assert.equal(preview['--font-body'], preview['--font-heading']);
    await act(async () => view.root.findByType('button').props.onClick());
    assert.deepEqual(draft, saved);
  } finally { if (view) await act(async () => view.unmount()); }
});
