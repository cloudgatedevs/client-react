import test from 'node:test';
import assert from 'node:assert/strict';
import {queryRows} from '../src/react/widgets/table-model.js';
import {validateFilters, matchesAdvancedFilters} from '../src/react/widgets/filter-model.js';
import {collectExportRows} from '../src/react/widgets/table-export.js';
const fields=[{key:'name',type:'text'},{key:'amount',type:'number'},{key:'date',type:'date'},{key:'status',type:'select',options:[{value:'Active'},{value:'Paused'}]}];
const rows=[{id:1,name:'Alpha',amount:0,date:'2026-01-01',status:'Active'},{id:2,name:'Beta',amount:25,date:'2026-02-01',status:'Paused'},{id:3,name:'Gamma',amount:75,date:'2026-03-01',status:'Active'}];
const filter=(rules,match='all')=>({match,rules});
test('advanced filters apply AND/OR and inclusive ranges before sorting/paging/export', async()=>{
  const advancedFilters=filter([{field:'amount',type:'number',operator:'between',value:0,valueTo:25},{field:'status',type:'select',operator:'in',value:['Active']}]);
  assert.deepEqual(queryRows(rows,fields,{advancedFilters}).rows,[rows[0]]);
  assert.deepEqual(queryRows(rows,fields,{advancedFilters:{...advancedFilters,match:'any'}}).rows,rows);
  const result=await collectExportRows({scope:'all',rows,columns:fields,query:{page:2,pageSize:1,advancedFilters},signal:new AbortController().signal});
  assert.deepEqual(result,[rows[0]]);
});
test('date and text conditions handle missing and invalid data',()=>{
  const dates=filter([{field:'date',type:'date',operator:'between',value:'2026-01-01',valueTo:'2026-02-01'}]);
  assert.equal(queryRows(rows,fields,{advancedFilters:dates}).total,2);
  assert.equal(matchesAdvancedFilters({date:new Date('bad')},fields,dates),false);
  assert.equal(matchesAdvancedFilters({date:null},fields,dates),false);
  assert.equal(queryRows(rows,fields,{advancedFilters:filter([{field:'name',type:'text',operator:'contains',value:'ALP'}])}).total,1);
});
test('filter validation rejects impossible dates, reversed ranges and unknown options',()=>{
  const rules=[{field:'date',operator:'on',value:'2026-02-30'},{field:'amount',operator:'between',value:20,valueTo:10},{field:'status',operator:'in',value:['Unknown']}];
  assert.ok(validateFilters(filter(rules),fields).every(Boolean));
  assert.deepEqual(validateFilters(filter([{field:'amount',operator:'equals',value:0}]),fields),['']);
});
