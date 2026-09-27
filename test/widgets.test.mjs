import test from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";
import {
  queryRows,
  clampPage,
  mergeRows,
  validatePage,
  pageNumbers,
} from "../src/react/widgets/table-model.js";
import {
  chartDomain,
  donutSegments,
  lineSegments,
  chartNumber,
} from "../src/react/widgets/chart-model.js";
import {
  widgets,
  widgetRecipes,
  getWidget,
  searchWidgets,
  widgetGuidelines,
} from "../src/widgets/catalog.js";

const columns = [
  { key: "name", label: "Name" },
  { key: "amount", label: "Amount" },
  { key: "status", label: "Status", searchable: false },
];
const rows = [
  { id: 1, name: "Project 10", amount: 30, status: "Active" },
  { id: 2, name: "Project 2", amount: 10, status: "Paused" },
  { id: 3, name: "Alpha", amount: null, status: "Active" },
  { id: 4, name: "Beta", amount: 20, status: "Paused" },
];
test("table filters and searches before sorting/paging, without mutating data", () => {
  const before = JSON.stringify(rows);
  assert.deepEqual(
    queryRows(rows, columns, {
      page: 2,
      pageSize: 1,
      search: "PROJECT",
      sort: { key: "name", direction: "asc" },
    }),
    { rows: [rows[0]], total: 2, page: 2 },
  );
  assert.equal(queryRows(rows, columns, { search: "Active" }).total, 0);
  assert.deepEqual(
    queryRows(rows, columns, {
      filters: { status: ["Paused"] },
      sort: { key: "amount", direction: "desc" },
    }).rows,
    [rows[3], rows[1]],
  );
  assert.equal(queryRows(rows, columns, { filters: { status: "" } }).total, 4);
  assert.equal(JSON.stringify(rows), before);
});
test("table supports derived search values, custom comparison and nulls last", () => {
  const derived = [
    ...columns,
    {
      key: "display",
      label: "Display",
      accessor: (row) => `${row.id} ${row.name}`,
    },
  ];
  assert.equal(queryRows(rows, derived, { search: "1 Project" }).total, 1);
  assert.deepEqual(
    queryRows(rows, columns, {
      sort: { key: "amount", direction: "desc" },
    }).rows.map((row) => row.id),
    [1, 4, 2, 3],
  );
  assert.deepEqual(
    queryRows(
      rows,
      [{ ...columns[0], compare: (a, b) => a.length - b.length }],
      { sort: { key: "name", direction: "asc" } },
    ).rows.map((row) => row.id),
    [4, 3, 2, 1],
  );
});
test("deleting the last page clamps the query and empty results stay on page one", () => {
  assert.equal(clampPage(8, 21, 10), 3);
  assert.equal(clampPage(8, 0, 10), 1);
  assert.deepEqual(queryRows(rows, columns, { page: 9, pageSize: 3 }), {
    rows: [rows[3]],
    total: 4,
    page: 2,
  });
  assert.deepEqual(pageNumbers(6, 12), [1, 5, 6, 7, 12]);
});
test("incremental pages replace duplicates by stable ID and preserve row order", () => {
  const updated = { ...rows[1], amount: 50 };
  assert.deepEqual(
    mergeRows(rows.slice(0, 2), [updated, rows[2]], (row) => row.id),
    [rows[0], updated, rows[2]],
  );
  for (const value of [
    null,
    {},
    { rows: [], total: -1 },
    { rows: [], total: 1.5 },
    { rows: [], total: "3" },
  ])
    assert.throws(() => validatePage(value));
  assert.deepEqual(validatePage({ rows: [], total: 0 }), {
    rows: [],
    total: 0,
  });
});
test("charts handle missing values, constant series and negative bars without invalid coordinates", () => {
  for (const value of [null, undefined, "", NaN, Infinity, "not a number"])
    assert.equal(chartNumber(value), null);
  assert.equal(chartNumber("0"), 0);
  for (const data of [
    [],
    [{ value: 0 }],
    [{ value: -8 }],
    [{ value: 2 }, { value: null }, { value: 2 }],
  ]) {
    const domain = chartDomain(data, [{ key: "value" }]);
    assert.ok(Number.isFinite(domain.min) && Number.isFinite(domain.max));
    assert.ok(domain.max > domain.min && domain.min <= 0 && domain.max >= 0);
  }
  assert.deepEqual(lineSegments([[0, 1], null, [2, 3], [3, 4], null]), [
    [[0, 1]],
    [
      [2, 3],
      [3, 4],
    ],
  ]);
});
test("donut totals exclude invalid and negative values; zero totals cannot divide by zero", () => {
  const result = donutSegments(
    [{ n: -2 }, { n: 30 }, { n: 70 }, { n: null }],
    "n",
  );
  assert.equal(result.total, 100);
  assert.deepEqual(
    result.segments.map((s) => s.percent),
    [0, 30, 70, 0],
  );
  assert.equal(result.segments[2].offset, 30);
  assert.deepEqual(donutSegments([{ n: 0 }], "n").segments, [
    { value: 0, percent: 0, offset: 0 },
  ]);
});
test("every published widget has discoverable docs and recipes reference real widgets", () => {
  assert.equal(new Set(widgets.map((w) => w.id)).size, widgets.length);
  assert.equal(getWidget("DataTable").id, "data-table");
  assert.equal(searchWidgets("server pagination")[0].id, "data-table");
  assert.equal(searchWidgets("server paginated table")[0].id, "data-table");
  assert.equal(searchWidgets("DataTable pagination loadRows")[0].id, "data-table");
  assert.equal(searchWidgets("lazy loading table")[0].id, "data-table");
  assert.equal(getWidget("missing"), undefined);
  for (const recipe of widgetRecipes)
    for (const id of recipe.widgets) assert.ok(getWidget(id));
  assert.match(widgetGuidelines, /AbortSignal/);
});
test("all catalogue examples and recipes compile against actual public widget exports", async () => {
  const entry = fileURLToPath(
    new URL("../src/react/widgets/index.jsx", import.meta.url),
  );
  for (const { id, example, code } of [...widgets, ...widgetRecipes]) {
    await build({
      stdin: {
        contents: example || code,
        sourcefile: `${id}.jsx`,
        loader: "jsx",
      },
      bundle: true,
      write: false,
      format: "esm",
      jsx: "automatic",
      logLevel: "silent",
      plugins: [
        {
          name: "widget-import",
          setup(builder) {
            builder.onResolve(
              { filter: /^@cloudgatedevs\/cloudgate-client-react\/react\/widgets$/ },
              () => ({ path: entry }),
            );
            builder.onResolve(
              {
                filter:
                    /^(react|react-dom|lucide-react|@radix-ui\/react-dialog|ckeditor5|@ckeditor\/ckeditor5-react|@fullcalendar\/react|@dnd-kit\/core)(\/.*)?$/,
              },
              (args) => ({ path: args.path, external: true }),
            );
          },
        },
      ],
    });
  }
});
test("MCP discovers and serves installed docs over stdio without writing arbitrary data", () => {
  const requests = [
    {
      jsonrpc: "2.0",
      id: 0,
      method: "initialize",
      params: {
        protocolVersion: "2025-06-18",
        capabilities: {},
        clientInfo: { name: "test", version: "1" },
      },
    },
    { jsonrpc: "2.0", method: "notifications/initialized" },
    { jsonrpc: "2.0", id: 1, method: "tools/list" },
    {
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: { name: "get_widget", arguments: { id: "data-table" } },
    },
    {
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: {
        name: "get_widget_recipe",
        arguments: { id: "remote-table-edit" },
      },
    },
    {
      jsonrpc: "2.0",
      id: 4,
      method: "tools/call",
      params: { name: "get_widget", arguments: { id: "missing" } },
    },
    {
      jsonrpc: "2.0",
      id: 5,
      method: "tools/call",
      params: { name: "get_widget", arguments: { path: "../../secrets" } },
    },
    { jsonrpc: "2.0", id: 6, method: "ping" },
  ];
  const child = spawnSync(
    process.execPath,
    [fileURLToPath(new URL("../src/widgets/mcp.mjs", import.meta.url))],
    {
      input: requests.map(JSON.stringify).join("\n") + "\n",
      encoding: "utf8",
      timeout: 10000,
    },
  );
  assert.equal(child.status, 0, child.stderr);
  const responses = child.stdout.trim().split("\n").map(JSON.parse);
  assert.equal(responses.length, 7);
  assert.equal(responses[0].id, 0);
  assert.equal(responses[0].result.protocolVersion, "2025-06-18");
  assert.ok(
    responses[1].result.tools.every(
      (tool) =>
        tool.annotations.readOnlyHint && !tool.annotations.destructiveHint,
    ),
  );
  assert.equal(
    JSON.parse(responses[2].result.content[0].text).result.id,
    "data-table",
  );
  assert.match(
    JSON.parse(responses[3].result.content[0].text).result.code,
    /loadRows/,
  );
  assert.equal(responses[4].result.isError, true);
  assert.equal(responses[5].error.code, -32602);
  assert.deepEqual(responses[6].result, {});
});
test("CLI returns the package version and actionable docs for an agent without MCP", async () => {
  const child = spawnSync(
    process.execPath,
    [
      fileURLToPath(new URL("../src/widgets/cli.mjs", import.meta.url)),
      "widget",
      "data-table",
    ],
    { encoding: "utf8", timeout: 10000 },
  );
  const manifest = JSON.parse(
    await readFile(new URL("../package.json", import.meta.url), "utf8"),
  );
  assert.equal(child.status, 0, child.stderr);
  const result = JSON.parse(child.stdout);
  assert.equal(result.sdkVersion, manifest.version);
  assert.equal(result.result.id, "data-table");
});
