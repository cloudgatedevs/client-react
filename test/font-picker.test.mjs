import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { JSDOM } from 'jsdom';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { DEFAULT_SETTINGS, fontVariables } from '../src/platform/appearance-model.js';
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost', pretendToBeVisual: true });
for (const name of ['window', 'document', 'DocumentFragment', 'HTMLElement', 'HTMLInputElement', 'HTMLSelectElement', 'HTMLFormElement', 'Element', 'Node', 'NodeFilter', 'MutationObserver', 'CustomEvent', 'Event']) {
  globalThis[name] = dom.window[name];
}
globalThis.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
globalThis.requestAnimationFrame = dom.window.requestAnimationFrame.bind(dom.window);
globalThis.cancelAnimationFrame = dom.window.cancelAnimationFrame.bind(dom.window);
globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
dom.window.HTMLElement.prototype.scrollIntoView = function () {};
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const require = createRequire(import.meta.url);
const { createRoot } = require('react-dom/client');
const { act } = React;
const compiled = await build({ entryPoints: [fileURLToPath(new URL('../src/react/settings/FontPicker.jsx', import.meta.url))],
  bundle: true, write: false, format: 'cjs', platform: 'node', packages: 'external', jsx: 'automatic' });
const module = { exports: {} };
new Function('require', 'module', 'exports', compiled.outputFiles[0].text)(require, module, module.exports);
const { FontPicker } = module.exports;
const key = async (element, value) => act(async () => {
  element.dispatchEvent(new window.KeyboardEvent('keydown', { key: value, bubbles: true, cancelable: true }));
});
async function choose(trigger, label, count) {
  await act(async () => { trigger.focus(); });
  await key(trigger, 'ArrowDown');
  const options = [...document.querySelectorAll('[role="option"]')];
  assert.equal(options.length, count);
  const option = options.find(node => node.textContent === label + 'Aa');
  assert.ok(option, label);
  await key(option, 'Enter');
}

test('font drafts preview independently and reset to saved values', async () => {
  let draft;
  const host = document.createElement('div'); document.body.append(host);
  const root = createRoot(host);
  const saved = { ...DEFAULT_SETTINGS, theme_font_body: 'dm-sans', theme_font_heading: 'lora' };
  function Harness() {
    const [value, setValue] = React.useState(saved);
    draft = value;
    return React.createElement(React.Fragment, null,
      React.createElement(FontPicker, { value, onChange: patch => setValue(old => ({ ...old, ...patch })) }),
      React.createElement('div', { 'data-preview': true, style: fontVariables(value) }),
      React.createElement('button', { 'data-reset': true, onClick: () => setValue(saved) }, 'Reset'));
  }
  try {
    await act(async () => root.render(React.createElement(Harness)));
    const [body, heading] = host.querySelectorAll('[role="combobox"]');
    await choose(body, 'Manrope', 15);
    assert.equal(draft.theme_font_body, 'manrope');
    assert.match(body.querySelector('[style*="font-family"]').style.fontFamily, /Cloudgate Manrope/);
    assert.equal(draft.theme_font_heading, 'lora');
    assert.equal(saved.theme_font_body, 'dm-sans');
    await choose(heading, 'Same as body font', 16);
    assert.match(heading.querySelector('[style*="font-family"]').style.fontFamily, /Cloudgate Manrope/);
    const preview = host.querySelector('[data-preview]').style;
    assert.equal(preview.getPropertyValue('--font-body'), preview.getPropertyValue('--font-heading'));
    await act(async () => host.querySelector('[data-reset]').click());
    assert.deepEqual(draft, saved);
    assert.match(body.querySelector('[style*="font-family"]').style.fontFamily, /Cloudgate DM Sans/);
    assert.match(heading.querySelector('[style*="font-family"]').style.fontFamily, /Cloudgate Lora/);
  } finally { await act(async () => root.unmount()); host.remove(); }
});
