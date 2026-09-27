import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {act,create} from 'react-test-renderer';
import {build,transform} from 'esbuild';
import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {cardIndex} from '../src/widgets/card-index.js';
import {cardSamples} from '../src/widgets/card-examples.js';
import {cardDate,cardMoney,cardPercent} from '../src/react/widgets/card-model.js';

const compiled=await build({entryPoints:[fileURLToPath(new URL('../src/react/widgets/Cards.jsx',import.meta.url))],bundle:true,write:false,format:'cjs',platform:'node',packages:'external',jsx:'automatic',logLevel:'silent'});
const loadCards=()=>{const module={exports:{}};new Function('require','module','exports',compiled.outputFiles[0].text)(createRequire(import.meta.url),module,module.exports);return module.exports;};
const Cards=loadCards(),InteractiveCards=loadCards();
const render=(Component,props)=>renderToStaticMarkup(React.createElement(Component,props));

test('all 18 app cards render named headings and withhold actions in loading/error/empty states',()=>{
  assert.equal(cardIndex.length,18);
  for(const card of cardIndex) {
    const Component=Cards[card.exportName],props={...cardSamples[card.id],showDataTable:false,action:{label:'Open record',onClick:()=>{}}};
    const ready=render(Component,props);
    assert.match(ready,/<article[^>]+aria-labelledby=/,card.id);assert.match(ready,/<h3 id=/,card.id);
    assert.match(ready,/Open record/,card.id);
    const loading=render(Component,{...props,loading:true});
    assert.match(loading,/aria-busy="true"/);assert.doesNotMatch(loading,/Open record/);
    const error=render(Component,{...props,error:'Unavailable',onRetry:()=>{}});
    assert.match(error,/Unavailable/);assert.match(error,/Try again/);assert.doesNotMatch(error,/Open record/);
    const empty=render(Component,{...props,empty:true});assert.match(empty,/Nothing here yet/);assert.doesNotMatch(empty,/Open record/);
  }
});
test('product stock, missing prices and disabled link actions never expose an enabled purchase',()=>{
  const html=render(Cards.ProductCard,{title:'Headphones',price:0,compareAtPrice:19,currency:'USD',locale:'en-US',available:false,rating:0,reviewCount:0,action:{label:'Buy',href:'/checkout'},secondaryAction:{label:'Details',href:'/details'}});
  assert.match(html,/\$0\.00/);assert.match(html,/Previously \$19\.00/);assert.match(html,/0 out of 5, 0 reviews/);assert.match(html,/Out of stock/);
  assert.doesNotMatch(html,/href="\/checkout"/);assert.match(html,/href="\/details"/);
  const missing=render(Cards.ProductCard,{title:'Unknown price'});assert.match(missing,/—/);assert.doesNotMatch(missing,/\$0\.00/);
  const disabled=render(Cards.ProductCard,{title:'Disabled',price:10,disabled:true,titleHref:'/item',action:{label:'Go',href:'/checkout'}});
  assert.doesNotMatch(disabled,/href=/);
});
test('saved items and task completion are controlled and disabled controls remain disabled',async()=>{
  const Cards=InteractiveCards;
  let saved,checked,view;
  await act(async()=>{view=create(React.createElement(Cards.ProductCard,{title:'Headphones',price:10,saved:false,onSavedChange:value=>{saved=value;}}));});
  const save=view.root.find(node=>node.type==='button' && node.props['aria-label']==='Save Headphones');
  await act(async()=>save.props.onClick());assert.equal(saved,true);assert.equal(save.props['aria-pressed'],false);
  await act(async()=>view.update(React.createElement(Cards.TaskCard,{title:'Review',checked:false,onCheckedChange:value=>{checked=value;}})));
  await act(async()=>view.root.findByType('input').props.onChange({target:{checked:true}}));assert.equal(checked,true);
  await act(async()=>view.update(React.createElement(Cards.TaskCard,{title:'Review',checked:true,disabled:true,onCheckedChange:()=>{}})));
  assert.equal(view.root.findByType('input').props.disabled,true);assert.match(JSON.stringify(view.toJSON()),/Completed/);
  await act(async()=>view.update(React.createElement(Cards.TaskCard,{title:'Review',checked:true,error:'Unavailable',onCheckedChange:()=>{}})));
  assert.equal(view.root.findAllByType('input').length,0);
  await act(async()=>view.unmount());
});
test('failed media falls back accessibly and a new source can load',async()=>{
  const Cards=InteractiveCards;
  let view;const props={title:'Course',image:{src:'/first.png',alt:'Course cover'}};
  await act(async()=>{view=create(React.createElement(Cards.CourseCard,props));});
  await act(async()=>view.root.findByType('img').props.onError());
  assert.equal(view.root.findAllByType('img').length,0);assert.ok(view.root.findByProps({'aria-label':'Course cover'}));
  await act(async()=>view.update(React.createElement(Cards.CourseCard,{...props,image:{src:'/second.png',alt:'New cover'}})));
  assert.equal(view.root.findByType('img').props.src,'/second.png');await act(async()=>view.unmount());
});
test('timeline structure, date-only handling and target calculations preserve meaning',()=>{
  const html=render(Cards.Timeline,{label:'Release history',items:[{id:'a',title:'Started',time:'Yesterday'},{id:'b',title:'Finished',time:'Today'}]});
  assert.match(html,/<ol[^>]*aria-label="Release history"/);assert.equal((html.match(/<li/g)||[]).length,2);assert.ok(html.indexOf('Started')<html.indexOf('Finished'));
  assert.match(render(Cards.Timeline,{items:[]}),/No activity yet/);
  assert.equal(cardDate('2026-10-12','en-US').day,'12');assert.equal(cardDate('2026-02-30'),null);
  assert.equal(cardPercent(0,100),0);assert.equal(cardPercent(120,100),100);assert.equal(cardPercent(1,0),null);
  assert.equal(cardMoney(NaN),'—');assert.match(cardMoney(0,'USD','en-US'),/\$0\.00/);
  const goal=render(Cards.GoalCard,{title:'Goal',value:120,target:100,animate:false});assert.match(goal,/120/);assert.match(goal,/Target reached/);
  assert.match(render(Cards.GoalCard,{title:'Goal',value:10,target:0}),/No target set/);
});
test('card headings are configurable and public declarations parse',async()=>{
  assert.match(render(Cards.ProjectCard,{title:'Project',headingLevel:2}),/<h2 /);
  const source=await readFile(new URL('../widgets.d.ts',import.meta.url),'utf8');
  await transform(source.replaceAll('export const ','export declare const '),{loader:'ts',sourcefile:'widgets.d.ts'});
  for(const card of cardIndex) assert.ok(source.includes(`function ${card.exportName}(`),card.exportName);
});
