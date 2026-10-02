import test from 'node:test';
import assert from 'node:assert/strict';
import { buildNetworkGraph, networkData, truncateLabel } from '../src/react/widgets/network-graph-model.js';
import { init } from '../src/react/widgets/chart-engine.js';

const sample = {
  focusId: 'subject',
  categories: [{ id: 'personal', label: 'Personal' }, { id: 'business', label: 'Business' }, { id: 'unknown', label: 'Unknown wallet' }],
  nodes: [
    { id: 'subject', label: 'Demo Test', sublabel: 'demo@example.com', category: 'personal', size: 12 },
    { id: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', label: 'Acme Ltd', category: 'business', size: 5 },
    { id: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', label: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', category: 'unknown', size: 1 },
  ],
  edges: [
    { source: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', target: 'subject', weight: 4, direction: 'forward', label: '4 transfers in' },
    { source: 'subject', target: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', weight: 1, direction: 'both', dashed: true },
  ],
};

test('builds a force graph with categories, pinned focus, sized nodes and directional edges', () => {
  const model = buildNetworkGraph({ ...sample, selectedId: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' });
  assert.equal(model.hasData, true);
  const series = model.option.series[0];
  assert.equal(series.layout, 'force');
  assert.deepEqual(model.legends, ['Personal', 'Business', 'Unknown wallet']);
  const focus = series.data.find(node => node.id === 'subject');
  assert.equal(focus.fixed, true); assert.equal(focus.x, 400); assert.equal(focus.y, 180);
  assert.equal(buildNetworkGraph({ ...sample, centerX: 250, centerY: 120 }).option.series[0].data[0].x, 250);
  assert.equal(series.categories[1].itemStyle.color, model.option.color[1], 'legend colour matches node colour');
  assert.ok(focus.symbolSize > series.data[2].symbolSize, 'focus node is the largest');
  const selected = series.data.find(node => node.id.startsWith('0xaaaa'));
  assert.equal(selected.itemStyle.borderWidth, 3);
  assert.equal(series.data[2].displayName, '0xbbbb…bbbb');
  assert.deepEqual(series.links[0].symbol, ['none', 'arrow']);
  assert.deepEqual(series.links[1].symbol, ['arrow', 'arrow']);
  assert.equal(series.links[1].lineStyle.type, 'dashed');
  assert.ok(series.links[0].lineStyle.width > series.links[1].lineStyle.width, 'heavier edge is wider');
  assert.equal(model.nodeRows.length, 3); assert.equal(model.edgeRows.length, 2);
  assert.equal(model.edgeRows[0].source, 'Acme Ltd');
});

test('shows the sublabel under the name, a pointer cursor, and a tooltip only when it adds detail', () => {
  const address = '0xcccccccccccccccccccccccccccccccccccccccc';
  const model = buildNetworkGraph({ focusId: 'subject', nodes: [
    { id: 'subject', label: 'Demo Test', sublabel: '0x1bfd…a03f', details: [{ label: 'Email', value: 'demo@example.com' }, { label: 'Empty', value: null }] },
    { id: 'short', label: 'Unknown wallet', sublabel: '0x1bfd…a03f' },
    { id: address, label: 'Unknown wallet', sublabel: address },
    { id: 'same', label: 'Acme Ltd', sublabel: 'Acme Ltd' },
  ], edges: [] });
  const series = model.option.series[0], format = series.label.formatter, tip = model.option.tooltip.formatter;
  assert.equal(series.cursor, 'pointer');
  assert.equal(format({ data: series.data[1] }), 'Unknown wallet\n{sub|0x1bfd…a03f}');
  assert.equal(format({ data: series.data[2] }), 'Unknown wallet\n{sub|0xcccc…cccc}', 'long addresses keep both ends');
  assert.equal(format({ data: series.data[3] }), 'Acme Ltd', 'a sublabel equal to the name is not repeated');
  assert.deepEqual(series.data.map(node => tip({ dataType: 'node', data: node }) !== ''), [true, false, true, false]);
  assert.match(tip({ dataType: 'node', data: series.data[0] }), /<strong>Demo Test<\/strong><br\/>0x1bfd…a03f<br\/><span[^>]*>Email<\/span> demo@example\.com$/);
  assert.match(tip({ dataType: 'node', data: series.data[2] }), new RegExp(address));
});

test('renders to SVG without NaN and honours reduced motion', () => {
  const model = buildNetworkGraph({ ...sample, reducedMotion: true });
  assert.equal(model.option.series[0].force.layoutAnimation, false);
  const instance = init(null, null, { renderer: 'svg', ssr: true, width: 800, height: 360 });
  try {
    instance.setOption({ ...model.option, animation: false, aria: { enabled: false } });
    const svg = instance.renderToSVGString();
    assert.match(svg, /<svg/); assert.doesNotMatch(svg, /NaN|Infinity/);
  } finally { instance.dispose(); }
});

test('validates ids, edge references and unknown categories', () => {
  assert.throws(() => networkData([{ id: 'a' }, { id: 'a' }], []), /unique/);
  assert.throws(() => networkData([{ id: 'a' }], [{ source: 'a', target: 'missing' }]), /existing node/);
  const data = networkData([{ id: 'a', category: 'later' }], [], []);
  assert.deepEqual(data.categories, [{ id: 'later', label: 'later' }]);
  assert.equal(buildNetworkGraph({ nodes: [], edges: [] }).hasData, false);
  assert.equal(truncateLabel('A very long counterparty display name here', 12), 'A very long…');
});
