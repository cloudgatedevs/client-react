import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { JSDOM } from 'jsdom';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost' });
for (const key of ['window', 'document', 'HTMLElement', 'Element', 'Node', 'NodeFilter', 'MutationObserver', 'CustomEvent', 'HTMLInputElement'])
  globalThis[key] = key === 'window' ? dom.window : key === 'document' ? dom.window.document : dom.window[key];
globalThis.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const require = createRequire(import.meta.url);
const { createRoot } = require('react-dom/client');
const { act } = React;
const compiled = await build({ stdin: { contents: "export {Modal} from './src/react/components/forms.jsx'; export {Dialog} from './src/react/widgets/primitives.jsx';", resolveDir: fileURLToPath(new URL('..', import.meta.url)), loader: 'jsx' },
  bundle: true, write: false, format: 'cjs', platform: 'node', packages: 'external', jsx: 'automatic', logLevel: 'silent' });
const module = { exports: {} };
new Function('require', 'module', 'exports', compiled.outputFiles[0].text)(require, module, module.exports);
const { Modal, Dialog } = module.exports;
const h = React.createElement;
const titleOf = element => document.getElementById(element.getAttribute('aria-labelledby'))?.textContent;
const byTitle = title => [...document.querySelectorAll('[role="dialog"]')].find(el => titleOf(el) === title);

for (const [name, Parent, Child] of [['Dialog > Modal', Dialog, Modal], ['Modal > Dialog', Modal, Dialog], ['Dialog > Dialog', Dialog, Dialog], ['Modal > Modal', Modal, Modal]]) {
  test(`${name}: child is above parent and Escape restores the opener`, async () => {
    let parentClosed = 0, childClosed = 0;
    function Example() {
      const [parentOpen, setParentOpen] = React.useState(true);
      const [childOpen, setChildOpen] = React.useState(false);
      return h(Parent, { open: parentOpen, title: 'Parent', onClose: () => { parentClosed++; setParentOpen(false); } },
        h('button', { id: 'child-opener', onClick: () => setChildOpen(true) }, 'Open child'),
        h(Child, { open: childOpen, title: 'Child', onClose: () => { childClosed++; setChildOpen(false); } }, h('input', { 'aria-label': 'Child input' })));
    }
    const host = document.createElement('div'); document.body.append(host);
    const root = createRoot(host);
    try {
      await act(async () => root.render(h(React.StrictMode, null, h(Example))));
      const opener = document.getElementById('child-opener');
      await act(async () => { opener.focus(); opener.click(); });
      const parent = byTitle('Parent'), child = byTitle('Child');
      assert.ok(parent && child);
      assert.ok(Number(child.style.zIndex) - 1 > Number(parent.style.zIndex));
      assert.equal(parent.getAttribute('aria-hidden'), 'true');
      await act(async () => { document.activeElement.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await new Promise(resolve => setTimeout(resolve, 5)); });
      await act(async () => { await new Promise(resolve => setTimeout(resolve, 10)); });
      assert.equal(childClosed, 1); assert.equal(parentClosed, 0);
      assert.equal(byTitle('Child'), undefined);
      assert.ok(document.activeElement === opener, 'Focus must return to child opener; actual=' + document.activeElement?.outerHTML?.slice(0, 160));
    } finally { await act(async () => root.unmount()); host.remove(); }
  });
}
