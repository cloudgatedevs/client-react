import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {create,act} from 'react-test-renderer';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {timelineDate,timelineGroups} from '../src/react/widgets/timeline-model.js';

const compiled=await build({entryPoints:[fileURLToPath(new URL('../src/react/widgets/Timeline.jsx',import.meta.url))],bundle:true,write:false,format:'cjs',platform:'node',packages:'external',jsx:'automatic',logLevel:'silent'});
function components(){const module={exports:{}};new Function('require','module','exports',compiled.outputFiles[0].text)(createRequire(import.meta.url),module,module.exports);return module.exports;}
const {Timeline}=components(),{Timeline:StaticTimeline}=components();
const render=props=>renderToStaticMarkup(React.createElement(StaticTimeline,props));
const entries=[{id:'created',title:'Created',dateTime:'2026-09-25T23:30:00Z'},{id:'review',title:'Review',dateTime:'2026-09-26T01:00:00Z',state:'current'}];
const button=(view,label)=>view.root.findAllByType('button').find(node=>node.children.includes(label));

test('timeline calendar days stay stable while instants respect the requested time zone',()=>{
  assert.equal(timelineDate('2026-09-26',{timeZone:'Pacific/Honolulu'}).key,'2026-09-26');
  assert.equal(timelineDate('2026-09-26T01:00:00Z',{timeZone:'America/Los_Angeles'}).key,'2026-09-25');
  assert.equal(timelineDate('2026-09-26T01:00:00Z',{timeZone:'UTC'}).key,'2026-09-26');
  assert.equal(timelineDate('2026-03-08T07:30:00Z',{timeZone:'America/New_York'}).key,'2026-03-08');
  for(const value of [null,'not a date','2026-02-30','2026-02-30T10:00:00Z']) assert.equal(timelineDate(value),null);
  assert.ok(timelineDate('2024-02-29'));
});

test('timeline grouping preserves supplied order and only combines adjacent calendar days',()=>{
  const items=[...entries,{id:'undated',title:'No date'},{id:'earlier',title:'Earlier',dateTime:'2026-09-25'}];
  const grouped=timelineGroups(items,{groupByDay:true,timeZone:'UTC'});
  assert.deepEqual(grouped.map(group=>group.key),['2026-09-25','2026-09-26','undated','2026-09-25']);
  assert.deepEqual(grouped.flatMap(group=>group.items.map(({item})=>item.id)),items.map(item=>item.id));
  assert.equal(grouped[2].label,'Undated');
  assert.equal(timelineGroups(entries,{groupByDay:true,timeZone:'America/Los_Angeles'}).length,1);
  assert.equal(timelineGroups(items).length,1);
  assert.throws(()=>timelineGroups([entries[0],entries[0]]),/unique/);
  assert.throws(()=>timelineGroups([{title:'Missing identity'}]),/string IDs/);
  assert.match(render({items:entries,timeZone:'Not/AZone'}),/Could not load timeline/);
});

test('timeline exposes ordered progression, dates and recoverable empty/loading/error states',()=>{
  const html=render({label:'Release history',items:entries});
  assert.match(html,/<ol[^>]*aria-label="Release history"/);
  assert.match(html,/aria-current="step"/);
  assert.match(html,/dateTime="2026-09-25T23:30:00Z"/);
  assert.ok(html.indexOf('Created')<html.indexOf('Review'));
  assert.doesNotMatch(html,/id="(?:created|review)"/);
  assert.match(render({items:[]}),/No activity yet/);
  const loading=render({items:entries,loading:true});
  assert.match(loading,/aria-busy="true"/);assert.match(loading,/role="status"/);assert.doesNotMatch(loading,/<ol/);
  const error=render({items:entries,error:'Connection lost',onRetry(){}});
  assert.match(error,/Connection lost/);assert.match(error,/Try again/);assert.match(error,/Created/);
  assert.doesNotMatch(render({items:entries,orientation:'horizontal',groupByDay:true}),/cgw-timeline-day/);
});

test('timeline details retain local state while toggling and disabled entries block built-in controls',()=>{
  let mounts=0,view;
  function Details(){React.useEffect(()=>{mounts++;},[]);return React.createElement('input',{defaultValue:'Draft'});}
  const props={items:[{...entries[0],details:React.createElement(Details),titleHref:'/example',action:{label:'Open',onClick(){}}}],hasMore:true,onLoadMore(){}};
  act(()=>{view=create(React.createElement(Timeline,props));});
  const toggle=button(view,'View details'),id=toggle.props['aria-controls'];
  assert.equal(view.root.findByProps({id}).props.hidden,true);
  act(()=>toggle.props.onClick());assert.equal(toggle.props['aria-expanded'],true);assert.equal(view.root.findByProps({id}).props.hidden,false);
  act(()=>toggle.props.onClick());assert.equal(mounts,1);assert.equal(view.root.findByProps({id}).props.hidden,true);
  act(()=>view.update(React.createElement(Timeline,{...props,disabled:true})));
  assert.ok(view.root.findAllByType('button').every(node=>node.props.disabled));
  assert.equal(view.root.findAllByType('a').length,0);
  act(()=>view.unmount());
});

test('timeline paging blocks duplicate requests and preserves entries on failure and retry',async()=>{
  let calls=0,resolve,reject,view;
  const onLoadMore=()=>{calls++;return new Promise((ok,fail)=>{resolve=ok;reject=fail;});};
  const props={items:entries,hasMore:true,onLoadMore};
  act(()=>{view=create(React.createElement(Timeline,props));});
  const click=button(view,'Load more activity').props.onClick;
  act(()=>{click();click();});assert.equal(calls,1);
  assert.equal(view.root.findAllByType('section')[0].props['aria-busy'],true);
  await act(async()=>reject(new Error('Offline')));
  assert.equal(view.root.findAllByType('article').length,2);assert.ok(button(view,'Try again'));
  assert.match(JSON.stringify(view.toJSON()),/Offline/);
  act(()=>button(view,'Try again').props.onClick());assert.equal(calls,2);
  await act(async()=>resolve());
  assert.doesNotMatch(JSON.stringify(view.toJSON()),/Offline/);
  act(()=>view.update(React.createElement(Timeline,{...props,items:[...entries,{id:'done',title:'Done'}],hasMore:false})));
  assert.equal(view.root.findAllByType('article').length,3);assert.equal(button(view,'Load more activity'),undefined);
  act(()=>view.unmount());
});
