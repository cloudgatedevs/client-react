import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { create, act } from "react-test-renderer";
import { build } from "esbuild";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const compiled = await build({
  entryPoints: [
    fileURLToPath(
      new URL("../src/react/widgets/DataTable.jsx", import.meta.url),
    ),
  ],
  bundle: true,
  write: false,
  format: "cjs",
  platform: "node",
  packages: "external",
  jsx: "automatic",
  logLevel: "silent",
});
const module = { exports: {} };
new Function("require", "module", "exports", compiled.outputFiles[0].text)(
  createRequire(import.meta.url),
  module,
  module.exports,
);
const { DataTable } = module.exports;
const columns = [{ key: "name", label: "Name" }];
const tableText = (view) => JSON.stringify(view.toJSON());
function controlledLoader() {
  const calls = [];
  const loadRows = (query) =>
    new Promise((resolve, reject) => calls.push({ query, resolve, reject }));
  return { calls, loadRows };
}
const click = async (view, label) =>
  act(async () =>
    view.root
      .find(
        (node) => node.type === "button" && node.props["aria-label"] === label,
      )
      .props.onClick(),
  );

const namedButton = (view, text) => view.root.find(node => node.type === 'button' && node.children.includes(text));
test('advanced remote filters reset incremental pages and cancel superseded requests', async () => {
  const remote=controlledLoader();let view;
  const render=advancedFilters=>React.createElement(DataTable,{columns,loadRows:remote.loadRows,pageSize:1,pagination:'load-more',advancedFilters});
  const initial={match:'all',rules:[]};
  await act(async()=>{view=create(render(initial));});
  await act(async()=>remote.calls[0].resolve({rows:[{id:1,name:'One'}],total:3}));
  await act(async()=>namedButton(view,'Load more').props.onClick());
  assert.equal(remote.calls[1].query.page,2);
  const next={match:'all',rules:[{field:'name',type:'text',operator:'contains',value:'Two'}]};
  await act(async()=>view.update(render(next)));
  assert.equal(remote.calls[1].query.signal.aborted,true);
  assert.equal(remote.calls[2].query.page,1);
  assert.deepEqual(remote.calls[2].query.advancedFilters,next);
  await act(async()=>remote.calls[2].resolve({rows:[{id:2,name:'Two'}],total:1}));
  await act(async()=>remote.calls[1].resolve({rows:[{id:3,name:'Stale'}],total:3}));
  assert.doesNotMatch(tableText(view),/Stale/);
  assert.doesNotMatch(tableText(view),/"One"/);
  await act(async()=>view.unmount());
});
const checkRow = async (view, name) => act(async () => {
  view.root.findAllByType('label').find(node => JSON.stringify(node.findAllByType('span').map(span => span.children.filter(child => typeof child === 'string').join(''))).includes(name))
    .findByType('input').props.onChange({target:{checked:true}});
});

test('subtables mount lazily, cancel on collapse, and keep parent selection independent', async () => {
  const child = controlledLoader();
  let view;
  await act(async () => {
    view = create(React.createElement(DataTable, {
      columns, rows:[{id:1,name:'Parent'}, {id:2,name:'Leaf'}], selectable:true,
      getRowLabel: row => row.name, getRowCanExpand: row => row.id === 1,
      renderExpandedRow: () => React.createElement(DataTable, {columns, loadRows:child.loadRows, selectable:true, label:'Children'}),
    }));
  });
  assert.equal(child.calls.length, 0);
  assert.equal(view.root.findAll(node => node.type === 'button' && node.props['aria-label'] === 'Expand Leaf').length, 0);
  await checkRow(view, 'Select row Parent');
  await click(view, 'Expand Parent');
  assert.equal(child.calls.length, 1);
  const expand = view.root.find(node => node.type === 'button' && node.props['aria-label'] === 'Collapse Parent');
  assert.equal(expand.props['aria-expanded'], true);
  assert.equal(view.root.findByProps({id:expand.props['aria-controls']}).props['aria-label'], 'Details for Parent');
  assert.equal(view.root.findByProps({className:'cgw-table-detail-row'}).findByType('td').props.colSpan, 3);
  await act(async () => child.calls[0].resolve({rows:[{id:'child',name:'Child'}],total:1}));
  const nested = view.root.find(node => node.type === 'section' && node.props['aria-label'] === 'Children');
  assert.ok(nested.findByType('tbody').findAllByType('input').every(node => !node.props.checked));
  await click(view, 'Collapse Parent');
  assert.equal(child.calls[0].query.signal.aborted, true);
  await click(view, 'Expand Parent');
  assert.equal(child.calls.length, 2);
  await click(view, 'Collapse Parent');
  assert.equal(child.calls[1].query.signal.aborted, true);
  await act(async () => child.calls[1].resolve({rows:[{id:'stale',name:'Stale child'}],total:1}));
  assert.doesNotMatch(tableText(view), /Stale child/);
  await act(async () => view.unmount());
});

test('controlled expansion follows caller IDs and detail colspan follows visible columns', async () => {
  let view, emitted;
  const render = expandedIds => React.createElement(DataTable, {
    columns:[...columns,{key:'status',label:'Status'}], rows:[{id:1,name:'One'}],
    selectable:true, rowActions:() => 'Edit', expandedIds, onExpandedChange:ids => {emitted = ids;},
    renderExpandedRow:() => 'Details',
  });
  await act(async () => { view = create(render([])); });
  await click(view, 'Expand 1');
  assert.deepEqual(emitted, [1]);
  assert.equal(view.root.findAllByProps({className:'cgw-table-detail-row'}).length, 0);
  await act(async () => view.update(render([1])));
  assert.equal(view.root.findByProps({className:'cgw-table-detail-row'}).findByType('td').props.colSpan, 5);
  const columnPicker = view.root.findByType('details');
  await act(async () => columnPicker.findAllByType('input')[1].props.onChange({target:{checked:false}}));
  assert.equal(view.root.findByProps({className:'cgw-table-detail-row'}).findByType('td').props.colSpan, 4);
  await click(view, 'Collapse 1');
  assert.deepEqual(emitted, []);
  await act(async () => view.unmount());
});

test('bulk actions receive selections across remote pages, prevent duplicates, retain failed selections and refresh on success', async () => {
  const remote = controlledLoader(), action = controlledLoader();
  let view;
  await act(async () => {
    view = create(React.createElement(DataTable, {
      columns, loadRows:remote.loadRows, pageSize:1, selectable:true,
      bulkActions:[{id:'pause',label:'Pause',onAction:action.loadRows}],
    }));
  });
  await act(async () => remote.calls[0].resolve({rows:[{id:1,name:'One'}],total:2}));
  await checkRow(view, 'Select row 1');
  await click(view, 'Next page');
  await act(async () => remote.calls[1].resolve({rows:[{id:2,name:'Two'}],total:2}));
  await checkRow(view, 'Select row 2');
  assert.match(tableText(view), /Includes rows outside this view/);
  const run = namedButton(view, 'Pause').props.onClick;
  await act(async () => { void run(); void run(); });
  assert.equal(action.calls.length, 1);
  assert.deepEqual(action.calls[0].query, [1,2]);
  assert.equal(namedButton(view, 'Pause').props.disabled, true);
  assert.equal(namedButton(view, 'Clear selection').props.disabled, true);
  const rowCheckbox = view.root.findAllByType('input').filter(node => node.props.type === 'checkbox').at(-1);
  assert.equal(rowCheckbox.props.disabled, true);
  await act(async () => action.calls[0].reject(new Error('Please retry')));
  assert.match(tableText(view), /Please retry/);
  assert.equal(view.root.findByProps({className:'cgw-selection-count'}).findByType('strong').children.join(''), '2 selected');
  assert.equal(namedButton(view, 'Pause').props.disabled, false);
  await act(async () => { void namedButton(view, 'Pause').props.onClick(); });
  await act(async () => action.calls[1].resolve());
  assert.equal(view.root.findAllByProps({className:'cgw-selection-bar'}).length, 0);
  assert.equal(remote.calls.length, 3);
  assert.equal(remote.calls[2].query.page, 2);
  assert.match(tableText(view), /Pause completed for 2 selected rows/);
  await act(async () => view.unmount());
});

test('bulk completion preserves new controlled IDs and supports retaining selection without refreshing', async () => {
  const actions = controlledLoader();
  let view, emitted, queries = 0;
  const render = (selectedIds, keep = false) => React.createElement(DataTable, {
    columns, rows:[{id:1,name:'One'}, {id:2,name:'Two'}], selectable:true, selectedIds,
    onSelectionChange:ids => {emitted=ids;}, onQueryChange:() => {queries++;},
    bulkActions:[{id:'export',label:'Export',onAction:actions.loadRows, clearSelectionOnSuccess:!keep,refreshOnSuccess:false}],
  });
  await act(async () => {view = create(render([1]));});
  await act(async () => {void namedButton(view,'Export').props.onClick();});
  await act(async () => view.update(render([1,2])));
  await act(async () => actions.calls[0].resolve());
  assert.deepEqual(emitted,[2]);
  assert.equal(queries,1);
  emitted = undefined;
  await act(async () => view.update(render([2],true)));
  await act(async () => {void namedButton(view,'Export').props.onClick();});
  await act(async () => actions.calls[1].resolve());
  assert.equal(emitted,undefined);
  assert.match(tableText(view),/1 selected/);
  assert.equal(queries,1);
  await act(async () => {void namedButton(view,'Export').props.onClick();});
  await act(async () => view.unmount());
  await act(async () => actions.calls[2].resolve());
  assert.equal(emitted,undefined);
});

test('Excel export is enabled by default and retained selections include rows on other pages', async () => {
  const remote = controlledLoader();
  let view;
  const render = exportable => React.createElement(DataTable, {columns,loadRows:remote.loadRows,pageSize:1,selectable:true,exportable});
  await act(async () => {view = create(render(undefined));});
  await act(async () => remote.calls[0].resolve({rows:[{id:1,name:'One'}],total:2}));
  await checkRow(view,'Select row 1');
  await click(view,'Next page');
  await act(async () => remote.calls[1].resolve({rows:[{id:2,name:'Two'}],total:2}));
  await checkRow(view,'Select row 2');
  const exporter = view.root.find(node=>typeof node.type === 'function' && node.type.name === 'TableExport');
  assert.deepEqual(await exporter.props.getRows({scope:'selected'}),[{id:1,name:'One'},{id:2,name:'Two'}]);
  assert.deepEqual(await exporter.props.getRows({scope:'page'}),[{id:2,name:'Two'}]);
  assert.equal(exporter.props.scopes[0].value,'selected');
  await act(async () => view.update(render(false)));
  assert.equal(view.root.findAll(node=>node.type === 'button' && node.props['aria-label'] === 'Export Records to Excel').length,0);
  await act(async () => view.unmount());
});

test("remote table aborts superseded requests and ignores a stale result even when the loader ignores abort", async () => {
  const { calls, loadRows } = controlledLoader();
  let view;
  const render = (filters) =>
    React.createElement(DataTable, {
      columns,
      loadRows,
      filters,
      debounceMs: 0,
    });
  await act(async () => {
    view = create(render({ status: "old" }));
  });
  assert.equal(calls.length, 1);
  assert.equal(view.root.findByProps({ className: 'cgw-table-loading-track' }).props['data-loading'], true);
  assert.ok(view.root.findAllByProps({ className: 'cgw-spin' }).length > 0);
  await act(async () => view.update(render({ status: "new" })));
  assert.equal(calls[0].query.signal.aborted, true);
  await act(async () =>
    calls[1].resolve({ rows: [{ id: 2, name: "New result" }], total: 1 }),
  );
  await act(async () =>
    calls[0].resolve({ rows: [{ id: 1, name: "Stale result" }], total: 1 }),
  );
  assert.match(tableText(view), /New result/);
  assert.doesNotMatch(tableText(view), /Stale result/);
  assert.equal(view.root.findByProps({ className: 'cgw-table-loading-track' }).props['data-loading'], undefined);
  await act(async () => view.unmount());
  assert.equal(calls[1].query.signal.aborted, true);
});

test("remote table keeps requests page-sized and merges incremental pages without duplicates", async () => {
  const { calls, loadRows } = controlledLoader();
  let view;
  await act(async () => {
    view = create(
      React.createElement(DataTable, {
        columns,
        loadRows,
        pageSize: 2,
        pagination: "load-more",
      }),
    );
  });
  await act(async () =>
    calls[0].resolve({
      rows: [
        { id: 1, name: "First" },
        { id: 2, name: "Second" },
      ],
      total: 5,
    }),
  );
  await act(async () =>
    view.root
      .find(
        (node) => node.type === "button" && node.children.includes("Load more"),
      )
      .props.onClick(),
  );
  assert.equal(calls[1].query.page, 2);
  assert.equal(calls[1].query.pageSize, 2);
  await act(async () =>
    calls[1].resolve({
      rows: [
        { id: 2, name: "Updated second" },
        { id: 3, name: "Third" },
      ],
      total: 5,
    }),
  );
  const cells = view.root
    .findAllByType("td")
    .map((cell) => cell.children.join(" "));
  assert.deepEqual(cells, ["First", "Updated second", "Third"]);
  await act(async () => view.unmount());
});

test("remote filters reset to page 1, refresh retries errors, and debounced search reaches the loader", async () => {
  const { calls, loadRows } = controlledLoader();
  let view;
  const render = (filters) =>
    React.createElement(DataTable, {
      columns,
      loadRows,
      filters,
      pageSize: 2,
      debounceMs: 5,
    });
  await act(async () => {
    view = create(render({ status: "" }));
  });
  await act(async () =>
    calls[0].resolve({
      rows: [
        { id: 1, name: "First" },
        { id: 2, name: "Second" },
      ],
      total: 8,
    }),
  );
  await click(view, "Next page");
  assert.equal(calls[1].query.page, 2);
  await act(async () =>
    calls[1].resolve({ rows: [{ id: 3, name: "Third" }], total: 8 }),
  );
  await act(async () => view.update(render({ status: "Active" })));
  assert.equal(calls[2].query.page, 1);
  assert.equal(calls[2].query.filters.status, "Active");
  await act(async () =>
    calls[2].reject(new Error("Temporary service failure")),
  );
  assert.match(tableText(view), /Temporary service failure/);
  await act(async () =>
    view.root
      .find(
        (node) => node.type === "button" && node.children.includes("Try again"),
      )
      .props.onClick(),
  );
  await act(async () => calls[3].resolve({ rows: [], total: 0 }));
  assert.match(tableText(view), /No records found/);
  await act(async () => {
    view.root
      .findAllByType("input")
      .find((node) => node.props.type === "search")
      .props.onChange({ target: { value: "latest" } });
    await new Promise((resolve) => setTimeout(resolve, 20));
  });
  assert.equal(calls.at(-1).query.search, "latest");
  assert.equal(calls.at(-1).query.page, 1);
  await act(async () => view.unmount());
});
