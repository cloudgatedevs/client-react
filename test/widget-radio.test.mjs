import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { JSDOM } from 'jsdom';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { getWidget, widgets, searchWidgets } from '../src/widgets/catalog.js';

const dom = new JSDOM('<!doctype html><html><body></body></html>', {url:'http://localhost'});
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.FormData = dom.window.FormData;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const require = createRequire(import.meta.url);
const { createRoot } = require('react-dom/client');
const { act } = React;
const compiled = await build({entryPoints:[fileURLToPath(new URL('../src/react/widgets/index.jsx', import.meta.url))],
  bundle:true, write:false, format:'cjs', platform:'node', packages:'external', jsx:'automatic', logLevel:'silent'});
const module = {exports:{}};
new Function('require', 'module', 'exports', compiled.outputFiles[0].text)(require, module, module.exports);
const { RadioGroup, Form } = module.exports;
const h = React.createElement;
const options = [{value:0,label:'Free'}, {value:'team',label:'Team',description:'Collaborate with your team.'}, {value:'blocked',label:'Unavailable',disabled:true}];
async function mount(element) {
  const host = document.createElement('div'); document.body.append(host);
  const root = createRoot(host);
  await act(async () => root.render(element));
  return {host, render: async el => act(async () => root.render(el)), close: async () => {await act(async () => root.unmount()); host.remove();}};
}
const inputs = host => [...host.querySelectorAll('input[type="radio"]')];
const checked = host => inputs(host).filter(input => input.checked).map(input => input.value);
const click = async node => act(async () => node.click());
const submit = async form => act(async () => form.dispatchEvent(new window.Event('submit', {bubbles:true,cancelable:true})));

test('one Select catalogue entry preserves native, searchable and legacy discovery', () => {
  const combined = getWidget('select');
  for (const key of ['Select','SearchSelect','search-select']) assert.equal(getWidget(key), combined);
  assert.equal(widgets.filter(widget => ['select','search-select'].includes(widget.id)).length, 1);
  assert.ok(searchWidgets('server search').includes(combined));
  assert.equal(getWidget('RadioGroup').id, 'radio');
});

test('radio groups support numeric zero, native form data, independent names and disabled options', async () => {
  const changes = [];
  const view = await mount(h('form', null,
    h(RadioGroup, {label:'Plan', name:'plan', options, defaultValue:0, onChange:(...args) => changes.push(args)}),
    h(RadioGroup, {label:'Other', options, defaultValue:'team'}),
    h(RadioGroup, {label:'Third', options, defaultValue:0})));
  try {
    const groups = view.host.querySelectorAll('fieldset');
    assert.deepEqual(checked(groups[0]), ['0']);
    assert.equal(new FormData(view.host.querySelector('form')).get('plan'), '0');
    assert.notEqual(inputs(groups[1])[0].name, inputs(groups[2])[0].name);
    await click(inputs(groups[0])[1]);
    assert.deepEqual(checked(groups[0]), ['team']);
    assert.deepEqual(changes[0], ['team', options[1]]);
    await click(inputs(groups[0])[2]);
    assert.equal(changes.length, 1);
    assert.deepEqual(checked(groups[1]), ['team']);
    assert.deepEqual(checked(groups[2]), ['0']);
    const radio = inputs(groups[0])[1];
    assert.equal(document.getElementById(radio.getAttribute('aria-labelledby')).textContent, 'Team');
    assert.match(document.getElementById(radio.getAttribute('aria-describedby')).textContent, /Collaborate/);
    assert.equal(groups[0].querySelector('legend').textContent, 'Plan');
  } finally { await view.close(); }
});

test('required and custom group validation block submit, focus a radio and read the selected value', async () => {
  const saved = [], validated = [];
  const view = await mount(h(Form, {onSubmit:data => saved.push(data.get('plan'))},
    h(RadioGroup, {label:'Plan', name:'plan', options, required:true,
      validationMessages:{required:'Choose a plan.'}, validate:(value, data) => {
        validated.push([value, data.get('plan')]);
        return value === 'team' ? 'Team is not available.' : undefined;
      }})));
  try {
    const form = view.host.querySelector('form');
    assert.equal(view.host.querySelector('[role="alert"]'), null);
    await submit(form);
    assert.deepEqual(saved, []);
    assert.equal(view.host.querySelector('[role="alert"]').textContent, 'Choose a plan.');
    assert.equal(document.activeElement, inputs(view.host)[0]);
    await click(inputs(view.host)[1]);
    assert.deepEqual(validated.at(-1), ['team','team']);
    assert.equal(view.host.querySelector('[role="alert"]').textContent, 'Team is not available.');
    await submit(form);
    assert.deepEqual(saved, []);
    await click(inputs(view.host)[0]);
    assert.equal(view.host.querySelector('[role="alert"]'), null);
    await submit(form);
    assert.deepEqual(saved, ['0']);
  } finally { await view.close(); }
});

test('uncontrolled form resets restore defaults, clear feedback and respect cancelled resets', async () => {
  const props = {label:'Plan', name:'plan', options, defaultValue:0};
  const view = await mount(h(Form, null, h(RadioGroup, props)));
  try {
    const form = view.host.querySelector('form');
    await click(inputs(view.host)[1]);
    await act(async () => form.reset());
    assert.deepEqual(checked(view.host), ['0']);
    await click(inputs(view.host)[1]);
    await view.render(h(Form, {onReset:event => event.preventDefault()}, h(RadioGroup, props)));
    await act(async () => form.reset());
    assert.deepEqual(checked(view.host), ['team']);
    await view.render(h(Form, null, h(RadioGroup, {label:'Plan',name:'plan',options,required:true, key:'empty'})));
    await submit(form);
    assert.ok(view.host.querySelector('[role="alert"]'));
    await act(async () => form.reset());
    assert.equal(view.host.querySelector('[role="alert"]'), null);
    assert.deepEqual(checked(view.host), []);
  } finally { await view.close(); }
});

test('controlled values follow the caller; disabling and reordering clears stale validation anchors', async () => {
  let selected;
  const ref = React.createRef();
  const props = {label:'Plan',name:'plan',options,value:0,ref,onChange:value => {selected=value;}};
  const view = await mount(h('form',null,h(RadioGroup, {...props,error:'Server rejected the choice.'})));
  try {
    const oldAnchor = ref.current;
    assert.equal(oldAnchor.validity.customError, true);
    await click(inputs(view.host)[1]);
    assert.equal(selected, 'team');
    assert.deepEqual(checked(view.host), ['0']);
    await view.render(h('form',null,h(RadioGroup,{...props,value:'team',options:[options[1],options[0],options[2]]})));
    assert.deepEqual(checked(view.host), ['team']);
    assert.notEqual(ref.current, oldAnchor);
    assert.ok(inputs(view.host).every(input => input.validity.valid));
    await view.render(h('form',null,h(RadioGroup,{...props,value:'team',disabled:true})));
    assert.ok(inputs(view.host).every(input => input.disabled));
    assert.equal(new FormData(view.host.querySelector('form')).has('plan'), false);
  } finally { await view.close(); }
});
