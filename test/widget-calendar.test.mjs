import test from 'node:test';
import assert from 'node:assert/strict';
import {calendarDate,prepareCalendarEvents,createCalendarLoader} from '../src/react/widgets/calendar-model.js';

test('calendar dates retain date-only boundaries, explicit offsets and leap days while rejecting invalid input',()=>{
  assert.equal(calendarDate('2028-02-29'),'2028-02-29');
  assert.equal(calendarDate('2026-09-26T09:30:00+02:00'),'2026-09-26T09:30:00+02:00');
  assert.equal(calendarDate(new Date('2026-09-26T09:00:00Z')),'2026-09-26T09:00:00.000Z');
  for(const date of ['2026-02-29','2026-13-01','2026-04-31','2026-09-26T24:01','yesterday',new Date(NaN)]) assert.throws(()=>calendarDate(date));
});
test('calendar normalization preserves original records and exclusive ends without enabling URLs or arbitrary HTML',()=>{
  const original={id:0,title:'<strong>Plain text</strong>',start:'2026-09-26',end:'2026-09-29',url:'javascript:alert(1)',tone:'success'};
  const [event]=prepareCalendarEvents([original]);
  assert.equal(event.id,'0');assert.equal(event.allDay,true);assert.equal(event.end,'2026-09-29');
  assert.equal(event.extendedProps.record,original);assert.equal(event.url,undefined);assert.equal(event.title,original.title);
  assert.equal(event.extendedProps.tone,'success');assert.equal(original.allDay,undefined);
  assert.equal(prepareCalendarEvents([{id:1,title:'Call',start:'2026-09-26T09:00:00Z',end:'2026-09-26T12:00:00+02:00',tone:'not-a-tone'}])[0].allDay,false);
  for(const events of [null,[original,original],[{...original,end:'2026-09-25'}],[{...original,end:'2026-09-26'}],[{...original,allDay:false}],[{...original,title:''}],[{...original,id:''}]]) assert.throws(()=>prepareCalendarEvents(events));
});
test('calendar server requests use exact visible ranges, abort on navigation and suppress late results and state',async()=>{
  const calls=[],states=[];
  const loader=createCalendarLoader(query=>new Promise((resolve,reject)=>calls.push({query,resolve,reject})),state=>states.push(state));
  const info={startStr:'2026-08-31T00:00:00+02:00',endStr:'2026-10-05T00:00:00+02:00',timeZone:'Africa/Johannesburg'};
  const first=loader.load(info),next=loader.load({...info,startStr:'2026-10-01T00:00:00+02:00'});
  assert.equal(calls[0].query.signal.aborted,true);
  assert.equal(calls[0].query.start,info.startStr);assert.equal(calls[0].query.end,info.endStr);assert.equal(calls[0].query.timeZone,info.timeZone);
  calls[1].resolve([{id:'new',title:'Latest',start:'2026-10-02'}]);assert.equal((await next)[0].id,'new');
  const length=states.length;calls[0].resolve([{id:'old',title:'Stale',start:'2026-09-02'}]);assert.deepEqual(await first,[]);assert.equal(states.length,length);
  const pending=loader.load(info);loader.abort();calls[2].reject(new Error('Late failure'));assert.deepEqual(await pending,[]);assert.equal(states.at(-1).loading,true);
});
test('calendar malformed responses and failures show recoverable errors, and retries clear them',async()=>{
  let result={},failure=false;const states=[];
  const loader=createCalendarLoader(async()=>{if(failure) throw new Error('Offline');return result;},state=>states.push(state));
  const info={startStr:'2026-09-01',endStr:'2026-10-01',timeZone:'UTC'};
  assert.deepEqual(await loader.load(info),[]);assert.match(states.at(-1).error,/array/);
  failure=true;await loader.load(info);assert.equal(states.at(-1).error,'Offline');
  failure=false;result=[];await loader.load(info);assert.deepEqual(states.at(-1),{loading:false,error:null});
});
