import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { create, act } from 'react-test-renderer';
import { renderToString } from 'react-dom/server';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const compiled = await build({ entryPoints: [fileURLToPath(new URL('../src/react/widgets/index.jsx', import.meta.url))],
  bundle: true, write: false, format: 'cjs', platform: 'node', packages: 'external', jsx: 'automatic', logLevel: 'silent' });
const module = { exports: {} };
new Function('require', 'module', 'exports', compiled.outputFiles[0].text)(createRequire(import.meta.url), module, module.exports);
const { CountUp, MetricCard, Card, LineChart, BarChart, DonutChart } = module.exports;

function clock(reduced = false) {
  const previous = Object.fromEntries(['window', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance'].map(key => [key, globalThis[key]]));
  let time = 0, id = 0;
  const frames = new Map(), listeners = new Set();
  const media = { matches: reduced, addEventListener: (_, fn) => listeners.add(fn), removeEventListener: (_, fn) => listeners.delete(fn) };
  globalThis.window = { matchMedia: () => media };
  globalThis.performance = { now: () => time };
  globalThis.requestAnimationFrame = fn => { frames.set(++id, fn); return id; };
  globalThis.cancelAnimationFrame = id => frames.delete(id);
  return {
    frames,
    async tick(ms) { time += ms; const queued = [...frames.values()]; frames.clear(); await act(async () => queued.forEach(fn => fn(time))); },
    async reduce() { media.matches = true; await act(async () => listeners.forEach(fn => fn())); },
    restore() { for (const [key, value] of Object.entries(previous)) { if (value === undefined) delete globalThis[key]; else globalThis[key] = value; } },
  };
}
const visualNumber = view => Number(view.root.findByProps({ 'aria-hidden': 'true' }).children[0]);

test('CountUp interpolates updates from its displayed value, handles decreases and cancels on unmount', async () => {
  const timer = clock(); let view;
  try {
    await act(async () => { view = create(React.createElement(CountUp, { value: 100, duration: 600, formatValue: String })); });
    assert.equal(visualNumber(view), 0);
    assert.equal(view.root.findByProps({ className: 'cgw-sr-only' }).children[0], '100');
    await timer.tick(300);
    const middle = visualNumber(view);
    assert.ok(middle > 0 && middle < 100);
    await act(async () => view.update(React.createElement(CountUp, { value: -20.5, duration: 600, formatValue: String })));
    assert.equal(visualNumber(view), middle);
    await timer.tick(300);
    assert.ok(visualNumber(view) < middle && visualNumber(view) > -20.5);
    await timer.tick(300);
    assert.equal(visualNumber(view), -20.5);
    assert.equal(timer.frames.size, 0);
    await act(async () => view.update(React.createElement(CountUp, { value: 200 })));
    assert.equal(timer.frames.size, 1);
  } finally { if (view) await act(async () => view.unmount()); assert.equal(timer.frames.size, 0); timer.restore(); }
});

test('reduced motion snaps an in-flight number to the final value and skips future frames', async () => {
  const timer = clock(); let view;
  try {
    await act(async () => { view = create(React.createElement(CountUp, { value: 250, formatValue: String })); });
    await timer.tick(100);
    await timer.reduce();
    assert.equal(visualNumber(view), 250);
    assert.equal(timer.frames.size, 0);
    await act(async () => view.update(React.createElement(CountUp, { value: 9000, formatValue: String })));
    assert.equal(visualNumber(view), 9000);
    assert.equal(timer.frames.size, 0);
  } finally { if (view) await act(async () => view.unmount()); timer.restore(); }
});

test('bar animations grow from the zero baseline for both signs and do not restart on equivalent data', async () => {
  const timer = clock(); let view;
  const render = (data, animate = true) => React.createElement(BarChart, { data, animate, series: [{ key: 'n', label: 'Net' }] });
  const rows = [{ label: 'A', n: 20 }, { label: 'B', n: -10 }];
  const bars = () => view.root.findAllByType('rect').filter(n => n.props.role === 'img');
  try {
    await act(async () => { view = create(render(rows)); });
    assert.deepEqual(bars().map(n => n.props.height), [0, 0]);
    const baseline = bars()[1].props.y;
    await timer.tick(325);
    assert.ok(bars()[0].props.height > 0);
    assert.equal(bars()[1].props.y, baseline);
    assert.ok(bars()[0].props.y < baseline);
    await timer.tick(325);
    const heights = bars().map(n => n.props.height);
    await act(async () => view.update(render(rows.map(row => ({ ...row })))));
    assert.deepEqual(bars().map(n => n.props.height), heights);
    assert.equal(timer.frames.size, 0);
    await act(async () => view.update(render([{ label: 'New', n: 100 }], false)));
    assert.ok(bars()[0].props.height > 0);
    assert.equal(timer.frames.size, 0);
  } finally { if (view) await act(async () => view.unmount()); timer.restore(); }
});

test('line and donut reveals complete after loading, with stable accessible values during motion', async () => {
  const timer = clock(); let view;
  try {
    const props = { data: [{ label: 'A', value: 40 }, { label: 'B', value: 60 }], series: [{ key: 'value', label: 'Value' }] };
    for (const Chart of [LineChart, DonutChart]) {
      await act(async () => { view = create(React.createElement(Chart, { ...props, loading: true })); });
      assert.equal(view.root.findAll(n => n.props.role === 'status' && n.props['aria-busy']).length, 1);
      assert.equal(timer.frames.size, 0);
      await act(async () => view.update(React.createElement(Chart, props)));
      assert.ok(timer.frames.size > 0);
      const labels = view.root.findAll(n => n.props.role === 'img').map(n => n.props['aria-label']);
      assert.ok(labels.some(label => label.includes('40')));
      await timer.tick(1000);
      assert.equal(timer.frames.size, 0);
      assert.deepEqual(view.root.findAll(n => n.props.role === 'img').map(n => n.props['aria-label']), labels);
      if (Chart === LineChart) assert.ok(view.root.findByType('clipPath').findByType('rect').props.width > 500);
      else assert.deepEqual(view.root.findAll(n => n.type === 'circle' && n.props.role === 'img').map(n => n.props.strokeDasharray), ['40 60', '60 40']);
      await act(async () => view.unmount()); view = null;
    }
  } finally { if (view) await act(async () => view.unmount()); timer.restore(); }
});

test('server-rendered numbers keep their final formatted value and cards expose shaped loading states', () => {
  assert.match(renderToString(React.createElement(MetricCard, { label: 'Sales', value: 1234, formatValue: n => `$${n}` })), /\$1234/);
  assert.match(renderToString(React.createElement(MetricCard, { label: 'Legacy', value: '8.2k' })), /8\.2k/);
  const card = renderToString(React.createElement(Card, { title: 'Project', loading: true }, 'Stale content'));
  assert.match(card, /cgw-widget-skeleton--card/);
  assert.doesNotMatch(card, /Stale content/);
});
