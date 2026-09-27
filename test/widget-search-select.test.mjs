import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { create, act } from 'react-test-renderer';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { filterOptions, validateOptions } from '../src/react/widgets/search-options.js';

test('local search matches accents, descriptions and every search word without mutating options', () => {
  const options = [{value:0,label:'Café studio',description:'Design team'}, {value:2,label:'Other',disabled:true}];
  assert.deepEqual(filterOptions(options, 'CAFE team'), [options[0]]);
  assert.deepEqual(filterOptions(options, 'other'), [options[1]]);
  assert.deepEqual(filterOptions(options, ''), options);
  assert.equal(options.length, 2);
  assert.equal(validateOptions(options), options);
  for (const invalid of [null, {}, [{value:'',label:'Empty'}], [{value:1,label:'A'}, {value:'1',label:'Duplicate'}], [{value:1,label:null}]]) {
    assert.throws(() => validateOptions(invalid));
  }
});

const compiled = await build({entryPoints:[fileURLToPath(new URL('../src/react/widgets/useSearchOptions.js', import.meta.url))],
  bundle:true, write:false, format:'cjs', platform:'node', packages:'external', jsx:'automatic', logLevel:'silent'});
const module = {exports:{}};
new Function('require', 'module', 'exports', compiled.outputFiles[0].text)(createRequire(import.meta.url), module, module.exports);
const {useSearchOptions} = module.exports;
const tick = () => act(async () => { await new Promise(resolve => setTimeout(resolve, 20)); });

async function harness(props) {
  let observed, view;
  function Probe(current) { observed = useSearchOptions(current); return null; }
  await act(async () => {view = create(React.createElement(Probe, props));});
  return {get state() {return observed;}, update: async next => act(async () => view.update(React.createElement(Probe, {...props, ...next}))),
    close:async () => act(async () => view.unmount())};
}
const loader = () => {
  const calls = [];
  return {calls, loadOptions:query => new Promise((resolve,reject) => calls.push({query,resolve,reject}))};
};

test('remote searches abort superseded requests and ignore stale responses even if the server ignores abort', async () => {
  const remote = loader();
  const probe = await harness({loadOptions:remote.loadOptions, search:'old', open:true, debounceMs:0, limit:10});
  try {
    await tick();
    assert.equal(remote.calls[0].query.search, 'old');
    assert.equal(remote.calls[0].query.limit, 10);
    await probe.update({search:'new'});
    assert.equal(remote.calls[0].query.signal.aborted, true);
    assert.deepEqual(probe.state.options, []);
    assert.equal(probe.state.loading, true);
    await tick();
    // Keep server ranking/fuzzy matches, without applying local substring search.
    await act(async () => remote.calls[1].resolve([{value:2,label:'Server-ranked result'}]));
    await act(async () => remote.calls[0].resolve([{value:1,label:'Stale'}]));
    assert.deepEqual(probe.state.options, [{value:2,label:'Server-ranked result'}]);
    assert.equal(probe.state.loading, false);
  } finally {await probe.close();}
  assert.equal(remote.calls[1].query.signal.aborted, true);
});

test('typing during debounce, closed dropdowns and insufficient search terms do not issue requests', async () => {
  const remote = loader();
  const probe = await harness({loadOptions:remote.loadOptions,search:'ab',open:true,debounceMs:60,minSearchLength:2});
  try {
    await probe.update({search:'a'});
    await tick();
    assert.equal(probe.state.enough, false);
    assert.equal(remote.calls.length, 0);
    await probe.update({search:'abc',open:false});
    await tick();
    assert.equal(remote.calls.length, 0);
    await probe.update({search:'final',debounceMs:0});
    await tick();
    assert.equal(remote.calls.length, 1);
    assert.equal(remote.calls[0].query.search, 'final');
    await probe.update({open:false});
    assert.equal(remote.calls[0].query.signal.aborted, true);
  } finally {await probe.close();}
});

test('invalid API results show an error, retry recovers, and changing the data source aborts old searches', async () => {
  const remote = loader();
  const probe = await harness({loadOptions:remote.loadOptions,search:'project',open:true,debounceMs:0,reloadKey:'tenant-a'});
  try {
    await tick();
    await act(async () => remote.calls[0].resolve({items:[]}));
    assert.match(probe.state.error.message, /array/);
    assert.equal(probe.state.loading, false);
    await act(async () => probe.state.retry());
    await tick();
    await act(async () => remote.calls[1].resolve([{value:0,label:'Zero ID'}]));
    assert.equal(probe.state.error, null);
    assert.equal(probe.state.options[0].value, 0);
    await probe.update({reloadKey:'tenant-b'});
    assert.equal(remote.calls[1].query.signal.aborted, true);
    assert.deepEqual(probe.state.options, []);
    await tick();
    assert.equal(remote.calls.length, 3);
  } finally {await probe.close();}
});
