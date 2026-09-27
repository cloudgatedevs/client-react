import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {create,act} from 'react-test-renderer';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {validateBoard,filterBoardCards,moveBoardCard,boardDropTarget,boardDate} from '../src/react/widgets/scrum-model.js';

const columns=[{id:'todo',title:'To do'},{id:'active',title:'In progress'},{id:'done',title:'Done'}];
const cards=[{id:'a',title:'Design onboarding',columnId:'todo',tags:['Design'],assignees:[{id:'maya',name:'Maya Chen'}],custom:{retained:true}},
  {id:'b',title:'Hidden task',columnId:'todo'},{id:'c',title:'Build dashboard',columnId:'active'},{id:'d',title:'Review theme',columnId:'active'}];
const order=(rows,column)=>rows.filter(row=>row.columnId===column).map(row=>row.id);
test('board moves preserve hidden cards, custom data and input immutability',()=>{
  const before=JSON.stringify(cards);
  assert.deepEqual(filterBoardCards(cards,'design maya').map(row=>row.id),['a']);
  assert.deepEqual(filterBoardCards(cards,'design','missing'),[]);
  const {cards:next,change}=moveBoardCard(cards,columns,'a','active',1);
  assert.deepEqual(order(next,'todo'),['b']);assert.deepEqual(order(next,'active'),['c','a','d']);
  assert.equal(next.find(row=>row.id==='a').custom,cards[0].custom);
  assert.equal(change.fromIndex,0);assert.equal(change.toIndex,1);assert.equal(JSON.stringify(cards),before);
  assert.deepEqual(order(moveBoardCard(next,columns,'a','done',99).cards,'done'),['a']);
});
test('board reorder and drop positions use destination indexes after removal',()=>{
  assert.deepEqual(order(moveBoardCard(cards,columns,'a','todo',1).cards,'todo'),['b','a']);
  assert.equal(moveBoardCard(cards,columns,'a','todo',0),null);
  assert.equal(moveBoardCard(cards,columns,'missing','todo',0),null);
  assert.deepEqual(boardDropTarget(cards,'a',{type:'card',cardId:'b'},true),{columnId:'todo',index:1});
  assert.deepEqual(boardDropTarget(cards,'a',{type:'card',cardId:'c'},false),{columnId:'active',index:0});
  assert.deepEqual(boardDropTarget(cards,'a',{type:'column',columnId:'done'}),{columnId:'done',index:0});
  assert.equal(boardDropTarget(cards,'a',{type:'card',cardId:'a'}),null);
});
test('board rejects ambiguous IDs and orphan records rather than silently hiding cards',()=>{
  assert.throws(()=>validateBoard(columns,[...cards,cards[0]]),/unique/);
  assert.throws(()=>validateBoard([...columns,columns[0]],cards),/unique/);
  assert.throws(()=>validateBoard(columns,[{...cards[0],columnId:'unknown'}]),/unknown column/);
  assert.equal(boardDate('2026-09-26','en-US').label,'Sep 26');assert.equal(boardDate('invalid'),null);
});

const compiled=await build({entryPoints:[fileURLToPath(new URL('../src/react/widgets/ScrumBoard.jsx',import.meta.url))],bundle:true,write:false,format:'cjs',platform:'node',packages:'external',jsx:'automatic',logLevel:'silent'});
const module={exports:{}};
new Function('require','module','exports',compiled.outputFiles[0].text)(createRequire(import.meta.url),module,module.exports);
const {ScrumBoard}=module.exports;
const props={columns,cards};
function dnd(view){return view.root.find(node=>node.props.onDragEnd && node.props.sensors);}
function drop(view){return dnd(view).props.onDragEnd({active:{data:{current:{cardId:'a'}},rect:{current:{translated:{top:0,height:100}}}},over:{data:{current:{type:'column',columnId:'done'}},rect:{top:0,height:500}}});}
test('async board moves prevent duplicate writes, report rejection, and retain controlled cards',async()=>{
  let reject,resolve,calls=0,view;const callback=()=>{calls++;return new Promise((yes,no)=>{resolve=yes;reject=no;});};
  await act(async()=>{view=create(React.createElement(ScrumBoard,{...props,onCardsChange:callback}));});
  await act(async()=>{drop(view);drop(view);});assert.equal(calls,1);
  assert.match(JSON.stringify(view.toJSON()),/Saving card/);
  await act(async()=>reject(new Error('Save denied')));
  assert.match(JSON.stringify(view.toJSON()),/Save denied/);
  assert.deepEqual(order(cards,'todo'),['a','b']);
  await act(async()=>drop(view));assert.equal(calls,2);
  await act(async()=>resolve());assert.doesNotMatch(JSON.stringify(view.toJSON()),/Saving card|Save denied/);
  await act(async()=>view.unmount());
});
test('read-only and disabled board prevent mutations; missing callbacks show no dead actions',async()=>{
  for(const mode of [{readOnly:true},{disabled:true},{loading:true}]) {
    let calls=0,view;await act(async()=>{view=create(React.createElement(ScrumBoard,{...props,...mode,onCardsChange:()=>calls++,onAddCard:()=>calls++}));});
    await act(async()=>drop(view));assert.equal(calls,0);
    assert.equal(view.root.findAll(node=>node.type==='button' && node.props['aria-label']?.startsWith('Move ')).length,0);
    await act(async()=>view.unmount());
  }
  let view;await act(async()=>{view=create(React.createElement(ScrumBoard,props));});
  assert.equal(view.root.findAll(node=>node.type==='button' && (node.props['aria-label']?.startsWith('Move ') || node.children.includes('Add card'))).length,0);
  await act(async()=>view.unmount());
});
