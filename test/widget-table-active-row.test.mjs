import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { JSDOM } from 'jsdom';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const dom = new JSDOM('<!doctype html><html><body></body></html>', {url:'http://localhost'});
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const require = createRequire(import.meta.url);
const { createRoot } = require('react-dom/client');
const { act } = React, h = React.createElement;
const compiled = await build({entryPoints:[fileURLToPath(new URL('../src/react/widgets/DataTable.jsx', import.meta.url))],
  bundle:true, write:false, format:'cjs', platform:'node', packages:'external', jsx:'automatic', logLevel:'silent'});
const module = {exports:{}};
new Function('require', 'module', 'exports', compiled.outputFiles[0].text)(require, module, module.exports);
const { DataTable } = module.exports;
const rows = [{id:0,name:'Alex'}, {id:1,name:'Sam'}, {id:2,name:'Jordan'}];
const base = {rows, columns:[{key:'name',label:'Name'}], getRowLabel:row=>row.name, exportable:false};
async function mount(props = {}) {
  const host = document.createElement('div'); document.body.append(host);
  const root = createRoot(host);
  const render = async extra => act(async () => root.render(h(DataTable,{...base,...extra})));
  await render(props);
  return {host, render, close: async () => {await act(async () => root.unmount()); host.remove();}};
}
const button = (host, label) => [...host.querySelectorAll('button')].find(node=>node.getAttribute('aria-label')===label);
const dataRow = (host, name) => [...host.querySelectorAll('tbody > tr')].find(row=>row.textContent===name);
const click = async node => act(async () => node.click());
const key = async (node, key) => act(async () => node.dispatchEvent(new window.KeyboardEvent('keydown',{key,bubbles:true,cancelable:true})));
const activeNames = host => [...host.querySelectorAll('tr[data-active]')].map(row=>row.textContent);

test('active row selection is opt-in, supports zero IDs and re-clicking does not repeat the callback', async () => {
  const calls = [];
  const view = await mount();
  try {
    assert.equal(button(view.host,'Activate row Alex'), undefined);
    await click(dataRow(view.host,'Alex').querySelector('td'));
    assert.deepEqual(activeNames(view.host), []);
    await view.render({rowSelectable:true,onActiveRowChange:(...args)=>calls.push(args)});
    await click(dataRow(view.host,'Alex').querySelector('td:last-child'));
    assert.deepEqual(activeNames(view.host), ['Alex']);
    assert.deepEqual(calls, [[0,rows[0]]]);
    assert.equal(document.activeElement,button(view.host,'Activate row Alex'));
    assert.equal(button(view.host,'Activate row Alex').getAttribute('aria-pressed'),'true');
    await click(button(view.host,'Activate row Alex'));
    assert.equal(calls.length,1);
    await click(dataRow(view.host,'Sam').querySelector('td:last-child'));
    assert.deepEqual(activeNames(view.host), ['Sam']);
    assert.deepEqual(calls[1],[1,rows[1]]);
  } finally {await view.close();}
});

test('row controls, bulk selection, expansion and custom interaction opt-outs stay independent', async () => {
  let edits=0, selected;
  const view = await mount({rowSelectable:true,defaultActiveRowId:0,selectable:true,onSelectionChange:ids=>{selected=ids;},
    columns:[{key:'name',label:'Name'}, {key:'controls',label:'Controls',render:()=>h('span',{'data-row-selection-ignore':true},'Custom control')}],
    rowActions:()=>h('button',{type:'button',onClick:()=>edits++},'Edit'),
    renderExpandedRow:row=>h('button',null,`Details ${row.name}`)});
  try {
    const samRow = button(view.host,'Activate row Sam').closest('tr');
    await click(samRow.querySelector('.cgw-table-actions button'));
    assert.equal(edits,1);
    await click(samRow.querySelector('input[type="checkbox"]'));
    assert.deepEqual(selected,[1]);
    await click(button(view.host,'Expand Sam'));
    const detailRow = view.host.querySelector('.cgw-table-detail-row');
    assert.equal(detailRow.querySelector('td').colSpan,6);
    await click(detailRow.querySelector('button'));
    await click(samRow.querySelector('[data-row-selection-ignore]'));
    assert.equal(button(view.host,'Activate row Alex').getAttribute('aria-pressed'),'true');
    assert.equal(button(view.host,'Activate row Sam').getAttribute('aria-pressed'),'false');
    assert.equal(samRow.getAttribute('data-selected'),'true');
    await click(samRow.querySelector('td:nth-last-child(3)'));
    assert.equal(button(view.host,'Activate row Sam').getAttribute('aria-pressed'),'true');
    assert.deepEqual(selected,[1]);
  } finally {await view.close();}
});

test('keyboard navigation skips unavailable rows, manages focus and never activates while busy', async () => {
  const props = {rowSelectable:true,getRowCanActivate:row=>row.id!==1};
  const view = await mount(props);
  try {
    assert.equal(button(view.host,'Activate row Alex').tabIndex,0);
    assert.equal(button(view.host,'Activate row Sam').disabled,true);
    await key(button(view.host,'Activate row Alex'),'ArrowDown');
    assert.equal(document.activeElement,button(view.host,'Activate row Jordan'));
    assert.deepEqual(activeNames(view.host),['Jordan']);
    await key(button(view.host,'Activate row Jordan'),'Home');
    assert.deepEqual(activeNames(view.host),['Alex']);
    await key(button(view.host,'Activate row Alex'),'End');
    assert.deepEqual(activeNames(view.host),['Jordan']);
    await click(dataRow(view.host,'Sam').querySelector('td:last-child'));
    assert.deepEqual(activeNames(view.host),['Jordan']);
    await view.render({...props,loading:true});
    await click(dataRow(view.host,'Alex').querySelector('td:last-child'));
    assert.deepEqual(activeNames(view.host),['Jordan']);
    assert.ok([...view.host.querySelectorAll('.cgw-table-active-button')].every(node=>node.disabled));
  } finally {await view.close();}
});

test('controlled state follows the caller; active IDs survive paging, sorting and filtering', async () => {
  let emitted;
  const props={rowSelectable:true,pageSize:1,onActiveRowChange:id=>{emitted=id;}};
  const view=await mount({...props,activeRowId:null});
  try {
    await click(button(view.host,'Activate row Alex'));
    assert.equal(emitted,0);
    assert.deepEqual(activeNames(view.host),[]);
    await view.render({...props,activeRowId:0});
    await click(button(view.host,'Next page'));
    assert.deepEqual(activeNames(view.host),[]);
    assert.equal(button(view.host,'Activate row Sam').tabIndex,0);
    await click(button(view.host,'Previous page'));
    assert.deepEqual(activeNames(view.host),['Alex']);
    await view.render({...props,activeRowId:0,filters:{name:'Sam'}});
    assert.deepEqual(activeNames(view.host),[]);
    await view.render({...props,activeRowId:0});
    assert.deepEqual(activeNames(view.host),['Alex']);
    await click([...view.host.querySelectorAll('button')].find(node=>node.textContent==='Name'));
    assert.deepEqual(activeNames(view.host),['Alex']);
    await view.render({...props,activeRowId:null});
    assert.deepEqual(activeNames(view.host),[]);
  } finally {await view.close();}
});

test('remote refresh retains the ID without replaying activation; load-more blocks stale-row clicks', async () => {
  const requests=[],calls=[];
  const loadRows=query=>new Promise(resolve=>requests.push({query,resolve}));
  const view=await mount({rows:undefined,loadRows,pagination:'load-more',pageSize:1,rowSelectable:true,onActiveRowChange:(...args)=>calls.push(args)});
  try {
    await act(async()=>requests[0].resolve({rows:[rows[0]],total:3}));
    await click(button(view.host,'Activate row Alex'));
    await click([...view.host.querySelectorAll('button')].find(node=>node.textContent==='Load more'));
    assert.equal(button(view.host,'Activate row Alex').disabled,true);
    await act(async()=>requests[1].resolve({rows:[rows[1]],total:3}));
    await click(button(view.host,'Activate row Sam'));
    assert.deepEqual(calls.map(([id])=>id),[0,1]);
    await click(button(view.host,'Refresh records'));
    await act(async()=>requests[2].resolve({rows:[{id:1,name:'Sam updated'}],total:1}));
    assert.deepEqual(activeNames(view.host),['Sam updated']);
    assert.equal(calls.length,2);
  } finally {await view.close();}
});
