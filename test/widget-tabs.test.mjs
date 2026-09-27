import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {create,act} from 'react-test-renderer';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const compiled=await build({entryPoints:[fileURLToPath(new URL('../src/react/widgets/Tabs.jsx',import.meta.url))],bundle:true,write:false,format:'cjs',platform:'node',packages:'external',jsx:'automatic',logLevel:'silent'});
const module={exports:{}};
new Function('require','module','exports',compiled.outputFiles[0].text)(createRequire(import.meta.url),module,module.exports);
const {Tabs}=module.exports;
const items=[{value:'a',label:'Account',content:'Account panel'},{value:'b',label:'Billing',disabled:true,content:'Billing panel'},{value:'c',label:'Security',content:'Security panel'}];
const buttons=view=>view.root.findAllByType('button');
const press=(button,key)=>act(()=>button.props.onKeyDown({key,preventDefault(){}}));
function setup(extra={}) {
  const changed=[],focused=[];let view;
  const props={items,value:'a',onChange:value=>changed.push(value),...extra};
  act(()=>{view=create(React.createElement(Tabs,props),{createNodeMock:element=>element.type==='button'?{focus:()=>focused.push(element.props.id),scrollIntoView(){}}:null});});
  return {view,changed,focused,props};
}
test('tabs skip disabled items, wrap, and use orientation and RTL keyboard direction',()=>{
  for(const config of [{},{orientation:'vertical'},{dir:'rtl'}]) {
    const {view,changed,focused}=setup(config),forward=config.orientation==='vertical'?'ArrowDown':config.dir==='rtl'?'ArrowLeft':'ArrowRight';
    press(buttons(view)[0],forward);assert.deepEqual(changed,['c']);assert.equal(focused.at(-1),buttons(view)[2].props.id);
    press(buttons(view)[2],forward);assert.equal(focused.at(-1),buttons(view)[0].props.id);
    press(buttons(view)[0],'End');assert.equal(changed.at(-1),'c');
    press(buttons(view)[2],'Home');assert.equal(focused.at(-1),buttons(view)[0].props.id);
    const before=changed.length;press(buttons(view)[0],config.orientation==='vertical'?'ArrowRight':'ArrowDown');assert.equal(changed.length,before);
    act(()=>view.unmount());
  }
});
test('manual activation moves only focus until the focused button is activated',()=>{
  const {view,changed}=setup({activationMode:'manual'});
  press(buttons(view)[0],'ArrowRight');assert.deepEqual(changed,[]);
  assert.equal(buttons(view)[2].props.tabIndex,0);assert.equal(buttons(view)[0].props['aria-selected'],true);
  act(()=>buttons(view)[2].props.onClick());assert.deepEqual(changed,['c']);
  act(()=>view.unmount());
});
test('disabled tabs preserve the selected panel and missing selections retain an entry point',()=>{
  const {view,changed,props}=setup({disabled:true,value:'c'});
  assert.equal(view.root.findAllByProps({role:'tabpanel'}).filter(panel=>!panel.props.hidden)[0].children[0],'Security panel');
  assert.ok(buttons(view).every(button=>button.props.disabled && button.props.tabIndex===-1));
  act(()=>buttons(view)[0].props.onClick());press(buttons(view)[0],'End');assert.deepEqual(changed,[]);
  act(()=>view.update(React.createElement(Tabs,{...props,value:'missing',disabled:false})));
  assert.equal(buttons(view)[0].props.tabIndex,0);assert.equal(buttons(view)[0].props['aria-selected'],true);
  act(()=>view.unmount());
});
test('panel relationships stay stable when items reorder and switchers use pressed buttons',()=>{
  const {view,props}=setup();const ids=buttons(view).map(button=>[button.props.id,button.props['aria-controls']]);
  act(()=>view.update(React.createElement(Tabs,{...props,items:[items[2],items[0],items[1]]})));
  assert.deepEqual([buttons(view)[1].props.id,buttons(view)[1].props['aria-controls']],ids[0]);
  for(const button of buttons(view)) assert.equal(view.root.findByProps({id:button.props['aria-controls']}).props['aria-labelledby'],button.props.id);
  act(()=>view.update(React.createElement(Tabs,{...props,items:items.map(({content,...item})=>item)})));
  assert.equal(view.root.findAllByProps({role:'tablist'}).length,0);assert.equal(buttons(view)[0].props['aria-pressed'],true);
  assert.ok(buttons(view).every(button=>button.props['aria-controls']===undefined));
  act(()=>view.unmount());
});
test('panels preserve local state by default and can opt into mount-on-selection',()=>{
  let mounts=0,unmounts=0;
  function Panel(){React.useEffect(()=>{mounts++;return()=>{unmounts++;};},[]);return React.createElement('input',{defaultValue:'Draft'});}
  const sample=items.filter(item=>!item.disabled).map(item=>({...item,content:React.createElement(Panel)}));
  const {view,props}=setup({items:sample});assert.equal(mounts,2);
  act(()=>view.update(React.createElement(Tabs,{...props,value:'c'})));assert.equal(unmounts,0);
  act(()=>view.update(React.createElement(Tabs,{...props,value:'c',keepMounted:false})));assert.equal(unmounts,1);
  act(()=>view.update(React.createElement(Tabs,{...props,value:'a',keepMounted:false})));assert.equal(mounts,3);assert.equal(unmounts,2);
  act(()=>view.unmount());
});
