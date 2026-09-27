import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { create, act } from 'react-test-renderer';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { validateControl } from '../src/react/widgets/validation.js';

function control(overrides = {}, flags = {}) {
  let custom = '';
  return {
    value: '', tagName: 'INPUT', type: 'text', willValidate: true,
    minLength: -1, maxLength: -1, form: null,
    setCustomValidity(message) { custom = message; },
    get validity() { return { ...flags, customError: !!custom, valid: !custom && !Object.values(flags).some(Boolean) }; },
    get validationMessage() { return custom; },
    ...overrides,
  };
}

test('constraints validate whitespace, optional empties and programmatically populated lengths', () => {
  assert.equal(validateControl(control({ required: true, value: '  ' })), 'This field is required.');
  assert.equal(validateControl(control({ minLength: 3, value: '' })), undefined);
  assert.equal(validateControl(control({ minLength: 3, value: 'ab' })), 'Use at least 3 characters.');
  assert.equal(validateControl(control({ maxLength: 3, value: 'abcd' })), 'Use no more than 3 characters.');
  assert.equal(validateControl(control({ type: 'number', minLength: 3, value: '1' })), undefined);
});

test('native email, URL, pattern and numeric constraints get useful overridable messages', () => {
  for (const [overrides, flags, expected] of [
    [{type:'email'}, {typeMismatch:true}, 'Enter a valid email address.'],
    [{type:'url'}, {typeMismatch:true}, 'Enter a valid URL, including https://.'],
    [{}, {patternMismatch:true}, 'Use the requested format.'],
    [{min:'2'}, {rangeUnderflow:true}, 'Enter a value of 2 or greater.'],
    [{max:'10'}, {rangeOverflow:true}, 'Enter a value of 10 or less.'],
    [{step:'2'}, {stepMismatch:true}, 'Use increments of 2.'],
  ]) assert.equal(validateControl(control(overrides, flags)), expected);
  assert.equal(validateControl(control({required:true}), {validationMessages:{required:'Choose a project.'}}), 'Choose a project.');
});

test('custom and server errors block validity, clear on correction, and skip non-validating controls', () => {
  const field = control({value:'admin'});
  const rule = {validate: value => value === 'admin' ? 'Reserved name.' : undefined};
  assert.equal(validateControl(field, rule), 'Reserved name.');
  assert.equal(field.validity.valid, false);
  field.value = 'team';
  assert.equal(validateControl(field, rule), undefined);
  assert.equal(field.validity.valid, true);
  assert.equal(validateControl(field, {...rule, error:'Already taken.'}), 'Already taken.');
  field.willValidate = false;
  assert.equal(validateControl(field, {validate: () => { throw new Error('must not run'); }}), undefined);
  assert.equal(field.validationMessage, '');
});

const compiled = await build({ entryPoints:[fileURLToPath(new URL('../src/react/widgets/index.jsx', import.meta.url))],
  bundle:true, write:false, format:'cjs', platform:'node', packages:'external', jsx:'automatic', logLevel:'silent' });
const module = {exports:{}};
new Function('require', 'module', 'exports', compiled.outputFiles[0].text)(createRequire(import.meta.url), module, module.exports);
const {Input, Form} = module.exports;
const errorText = view => view.root.findAllByProps({role:'alert'}).map(node => node.children.join(''));

test('fields wait for blur, update feedback on change and preserve native handlers and refs', async () => {
  let blurred = 0, changed = 0, view;
  const ref = {current:null};
  const field = control({required:true});
  await act(async () => { view = create(React.createElement(Input, {label:'Name', required:true, ref,
    onBlur:() => blurred++, onChange:() => changed++}), {createNodeMock: node => node.type === 'input' ? field : null}); });
  assert.equal(ref.current, field);
  assert.deepEqual(errorText(view), []);
  await act(async () => view.root.findByType('input').props.onBlur({currentTarget:field}));
  assert.deepEqual(errorText(view), ['This field is required.']);
  assert.equal(view.root.findByType('input').props['aria-invalid'], true);
  assert.equal(blurred, 1);
  field.value = 'Project';
  await act(async () => view.root.findByType('input').props.onChange({currentTarget:field}));
  assert.deepEqual(errorText(view), []);
  assert.equal(changed, 1);
  assert.equal(field.validity.valid, true);
  await act(async () => view.unmount());
  assert.equal(ref.current, null);
});

test('form validates all fields, focuses the first error, rechecks dependent fields, and resets feedback', async () => {
  const NativeFormData = globalThis.FormData;
  globalThis.FormData = class {
    constructor(form) { this.values = Object.fromEntries(form.elements.map(field => [field.name, field.value])); }
    get(name) { return this.values[name]; }
  };
  let view, focused, submitted;
  const form = {elements:[]};
  const first = control({name:'email', required:true, form, focus:() => {focused='email';}});
  const second = control({name:'confirmation', required:true, form, focus:() => {focused='confirmation';}});
  form.elements = [first, second];
  const event = {currentTarget:form, preventDefault() {this.defaultPrevented=true;}};
  try {
    await act(async () => { view = create(React.createElement(Form, {onSubmit:data => {submitted=data;}},
      React.createElement(Input, {name:'email', required:true}),
      React.createElement(Input, {name:'confirmation', required:true, validate:(value,data) => value === data.get('email') ? undefined : 'Values must match.'})),
      {createNodeMock:node => node.type === 'form' ? form : node.type === 'input' ? (node.props.name === 'email' ? first : second) : null}); });
    await act(async () => view.root.findByType('form').props.onSubmit(event));
    assert.equal(event.defaultPrevented, true);
    assert.equal(submitted, undefined);
    assert.equal(focused, 'email');
    assert.equal(errorText(view).length, 2);
    first.value = 'a@example.com'; second.value = 'b@example.com';
    await act(async () => view.root.findAllByType('input')[1].props.onChange({}));
    assert.deepEqual(errorText(view), ['Values must match.']);
    first.value = 'b@example.com';
    await act(async () => view.root.findAllByType('input')[0].props.onChange({}));
    assert.deepEqual(errorText(view), []);
    await act(async () => view.root.findByType('form').props.onSubmit(event));
    assert.equal(submitted.get('email'), 'b@example.com');
    first.value = ''; second.value = '';
    await act(async () => view.root.findByType('form').props.onReset({defaultPrevented:false}));
    assert.deepEqual(errorText(view), []);
    await act(async () => view.root.findByType('form').props.onSubmit(event));
    assert.equal(errorText(view).length, 2);
  } finally {
    if (view) await act(async () => view.unmount());
    globalThis.FormData = NativeFormData;
  }
});
