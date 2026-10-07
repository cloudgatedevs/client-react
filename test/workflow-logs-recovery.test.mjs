import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { JSDOM } from 'jsdom';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/backoffice/logs' });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const require = createRequire(import.meta.url);
const { createRoot } = require('react-dom/client');
const compiled = await build({ stdin: { contents: `
  export { CloudgateWorkflowLogs } from './src/react/integrations/CloudgateWorkflowLogs.jsx';
  export { CloudgateProvider } from './src/react/context.jsx';
`, resolveDir: fileURLToPath(new URL('..', import.meta.url)), loader: 'jsx' },
  bundle: true, write: false, format: 'cjs', platform: 'node', packages: 'external', jsx: 'automatic', logLevel: 'silent' });
const module = { exports: {} };
new Function('require', 'module', 'exports', compiled.outputFiles[0].text)(require, module, module.exports);
const { CloudgateWorkflowLogs, CloudgateProvider } = module.exports;
const h = React.createElement, { act } = React;
const totals = { calls: 0, success: 0, unauthorized: 0, errors: 0, successRate: 0, avgMs: 0, p95Ms: 0 };
const summary = () => ({ current: totals, previous: totals, byRoute: [], buckets: [], to: new Date().toISOString() });
const calls = { totalCount: 1, items: [{ id: 1, route: 'orders/list', outcome: 'success', httpStatusCode: 200, durationMs: 1 }] };
const timeout = () => Promise.reject(new Error('Cloudgate took too long to respond. Please try again.'));

async function mount(logs) {
  const host = document.createElement('div'); document.body.append(host);
  const root = createRoot(host);
  const client = { logs: { scope: { configured: true, projectPath: '*', environment: 'sbx' }, ...logs },
    resolveAppIdentity: async () => ({ environment: 'sbx' }) };
  await act(async () => root.render(h(CloudgateProvider, { client }, h(CloudgateWorkflowLogs))));
  return { host, client, close: async () => { await act(async () => root.unmount()); host.remove(); } };
}
async function click(host, label) {
  const button = [...host.querySelectorAll('button')].find(b => b.textContent.trim() === label);
  assert.ok(button, `Missing ${label} button`);
  await act(async () => button.click());
}

test('summary failure leaves calls usable and retry does not request the list again', async () => {
  let rejectSummary, summaryCount = 0, listCount = 0;
  const view = await mount({ summary: () => { summaryCount++; return new Promise((_, reject) => { rejectSummary = reject; }); },
    list: async () => { listCount++; return calls; } });
  try {
    assert.match(view.host.textContent, /orders\/list/);
    await act(async () => rejectSummary(new Error('Statistics timed out')));
    assert.match(view.host.textContent, /Statistics timed out/);
    assert.match(view.host.textContent, /orders\/list/);
    assert.equal(view.host.querySelector('.cwl-grid'), null);
    view.client.logs.summary = async () => { summaryCount++; return summary(); };
    await click(view.host, 'Retry statistics');
    assert.equal(summaryCount, 2);
    assert.equal(listCount, 1);
    assert.ok(view.host.querySelector('.cwl-grid'));
    assert.doesNotMatch(view.host.textContent, /Statistics timed out/);
  } finally { await view.close(); }
});

test('failed requests do not show empty results; list retry is independent of statistics', async () => {
  let summaryCount = 0, listCount = 0;
  const view = await mount({ summary: () => { summaryCount++; return timeout(); }, list: () => { listCount++; return timeout(); } });
  try {
    assert.equal(view.host.querySelectorAll('[role="alert"]').length, 2);
    assert.doesNotMatch(view.host.textContent, /No calls match|No calls in this period/);
    view.client.logs.list = async () => { listCount++; return { totalCount: 0, items: [] }; };
    await click(view.host, 'Retry calls');
    assert.equal(summaryCount, 1); assert.equal(listCount, 2);
    assert.equal(view.host.querySelectorAll('[role="alert"]').length, 1);
    assert.match(view.host.textContent, /No calls match/);
  } finally { await view.close(); }
});

test('summary completion causes no duplicate list fetch; Refresh updates the time window exactly once', async () => {
  const originalNow = Date.now;
  let now = originalNow(), summaryCount = 0, resolveSummary;
  const requests = [];
  Date.now = () => now;
  const view = await mount({ summary: () => { summaryCount++; return new Promise(resolve => { resolveSummary = resolve; }); },
    list: async input => { requests.push(input); return calls; } });
  try {
    now += 1000;
    await act(async () => resolveSummary(summary()));
    assert.equal(requests.length, 1);
    await click(view.host, 'Refresh');
    assert.equal(summaryCount, 2); assert.equal(requests.length, 2);
    assert.equal(Date.parse(requests[1].startDate) - Date.parse(requests[0].startDate), 1000);
    now += 1000;
    await act(async () => resolveSummary(summary()));
    assert.equal(requests.length, 2);
  } finally { await view.close(); Date.now = originalNow; }
});
