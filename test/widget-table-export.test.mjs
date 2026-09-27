import test from 'node:test';
import assert from 'node:assert/strict';
import { unzipSync, strFromU8 } from 'fflate';
import { collectExportRows, excelFileName, excelSheetName, excelSheetData, createExcelBlob } from '../src/react/widgets/table-export.js';

const columns = [{key:'name',label:'Name'},{key:'amount',label:'Amount'}];
const rows = [{id:1,name:'Alpha',amount:30},{id:2,name:'Bravo',amount:10},{id:3,name:'Alpha two',amount:20}];
const query = {page:2,pageSize:1,search:'Alpha',sort:{key:'amount',direction:'asc'},filters:{}};

test('Excel scopes export all filtered sorted rows, exactly the current page, or selection across filters', async () => {
  const options = {columns,rows,visibleRows:[rows[0]],query};
  assert.deepEqual(await collectExportRows({...options,scope:'all'}), [rows[2],rows[0]]);
  assert.deepEqual(await collectExportRows({...options,scope:'page'}), [rows[0]]);
  assert.deepEqual(await collectExportRows({...options,scope:'selected',selectedIds:[2,1]}), [rows[1],rows[0]]);
  assert.deepEqual(rows.map(row=>row.id),[1,2,3]);
});

test('remote export requests every page with the original filter/sort and supports cancellation', async () => {
  const calls = [], progress = [], controller = new AbortController();
  const loadRows = async args => { calls.push(args); return {rows:[rows[args.page - 1]],total:3}; };
  const result = await collectExportRows({scope:'all',query,loadRows,signal:controller.signal,onProgress:(n,total)=>progress.push([n,total])});
  assert.deepEqual(result,rows);
  assert.deepEqual(calls.map(call=>call.page),[1,2,3]);
  assert.ok(calls.every(call=>call.search === 'Alpha' && call.pageSize === 1 && call.signal === controller.signal && call.sort.direction === 'asc'));
  assert.deepEqual(progress.at(-1),[3,3]);
  calls.length = 0;
  await assert.rejects(collectExportRows({scope:'all',query,signal:controller.signal,loadRows:async args=>{
    calls.push(args); controller.abort(); return {rows:[rows[0]],total:3};
  }}), {name:'AbortError'});
  assert.equal(calls.length,1);
});

test('remote export refuses incomplete, repeated, changing or oversized datasets instead of downloading partial files', async () => {
  for (const loadRows of [
    async () => ({rows:[],total:1}),
    async () => ({rows:[rows[0]],total:2}),
    async ({page}) => ({rows:[rows[page-1]],total:page === 1 ? 3 : 2}),
    async () => ({rows:[rows[0]],total:50001}),
    async () => ({rows:[rows[0]],total:'3'}),
  ]) await assert.rejects(collectExportRows({scope:'all',query,loadRows}));
});

test('remote selected export uses retained snapshots and a custom loader can resolve unloaded IDs', async () => {
  const loadRows = async () => {throw new Error('Do not fetch the full dataset for a selection');};
  const options = {scope:'selected',query,loadRows,selectedIds:[2,1],selectedRows:new Map([[1,rows[0]],[2,rows[1]]])};
  assert.deepEqual(await collectExportRows(options),[rows[1],rows[0]]);
  await assert.rejects(collectExportRows({...options,selectedIds:[99]}),/no longer loaded/);
  const signal = new AbortController().signal;
  let received;
  assert.deepEqual(await collectExportRows({...options,selectedIds:[99],signal,loadExportRows:async args=>{
    received = args; return [{id:99,name:'Remote selection'}];
  }}),[{id:99,name:'Remote selection'}]);
  assert.deepEqual(received.selectedIds,[99]);
  assert.equal(received.scope,'selected');
  assert.equal(received.signal,signal);
  await assert.rejects(collectExportRows({...options,loadExportRows:async()=>({rows:[]})}),/array/);
});

test('Excel formatting preserves scalar types, formats, derived values and excludes non-exportable columns', () => {
  const date = new Date('2026-09-26T12:00:00Z');
  const result = excelSheetData([{name:'=1+1',amount:12.5,enabled:false,created:date,secret:'hidden'}], [
    {key:'name',label:'Name'}, {key:'amount',label:'Amount',exportFormat:'$#,##0.00'},
    {key:'enabled',label:'Enabled'}, {key:'created',label:'Created'},
    {key:'secret',label:'Secret',exportable:false},
    {key:'derived',label:'Derived',exportLabel:'Double',exportValue:row=>row.amount*2,exportWidth:22},
  ]);
  assert.equal(result.data[0].length,5);
  assert.deepEqual(result.data[1].map(cell=>cell.value),['=1+1',12.5,false,date,25]);
  assert.deepEqual(result.data[1].map(cell=>cell.type),[String,Number,Boolean,Date,Number]);
  assert.equal(result.data[1][1].format,'$#,##0.00');
  assert.equal(result.data[0][4].value,'Double');
  assert.equal(result.columns[4].width,22);
  assert.throws(()=>excelSheetData([{name:'x'.repeat(32768)}],columns),/text limit/);
  assert.throws(()=>excelSheetData([],[]),/no exportable columns/);
});

test('generated workbook is genuine XLSX with typed cells, safe literal strings and frozen headers', async () => {
  const blob = await createExcelBlob([{name:'=HYPERLINK("https://example.com")',amount:12.5,enabled:true,date:new Date('2026-09-26T12:00:00Z')}], [
    ...columns,{key:'enabled',label:'Enabled'},{key:'date',label:'Date'},
  ], 'Orders / review');
  const zip = unzipSync(new Uint8Array(await blob.arrayBuffer()));
  const sheet = strFromU8(zip['xl/worksheets/sheet1.xml']);
  assert.ok(zip['[Content_Types].xml']);
  assert.match(sheet,/<v>12\.5<\/v>/);
  assert.match(sheet,/t="b"/);
  assert.doesNotMatch(sheet,/<f[ >]/);
  assert.match(sheet,/state="frozen"/);
  assert.match(strFromU8(zip['xl/workbook.xml']),/Orders   review/);
  const text = Object.entries(zip).filter(([name])=>name.endsWith('.xml')).map(([,bytes])=>strFromU8(bytes)).join('');
  assert.match(text,/HYPERLINK/);
});

test('Excel file and sheet names handle invalid characters, reserved file names and blank titles', () => {
  assert.equal(excelFileName('Orders / May.xlsx'),'Orders - May.xlsx');
  assert.equal(excelFileName('CON'),'Export-CON.xlsx');
  assert.equal(excelFileName('  '),'Records.xlsx');
  assert.equal(excelSheetName("'Orders / May'"),'Orders   May');
  assert.equal(excelSheetName('x'.repeat(60)).length,31);
});
