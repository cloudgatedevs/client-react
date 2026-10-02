// Pure model for the NetworkGraph widget: validates nodes/edges, assigns category colours, sizes
// nodes and edges, and produces the ECharts option plus accessible table rows. No DOM access, so
// it is unit-testable and can be rendered server-side.
const MAX_NODES = 400, MAX_EDGES = 1500;
const DIRECTIONS = new Set(['forward', 'both', 'none']);

function finite(value) { const number = Number(value); return Number.isFinite(number) ? number : null; }
function clamp(value, low, high) { return Math.min(high, Math.max(low, value)); }
function scale(value, from, to, min, max) {
  if (from === to) return min + (max - min) * 0.25;
  return min + (max - min) * clamp((value - from) / (to - from), 0, 1);
}
export function truncateLabel(text, max = 22) {
  const value = String(text ?? '');
  if (value.length <= max) return value;
  // Keep the start and end of hashes/addresses readable: 0x1234…abcd.
  return /^0x[0-9a-f]{20,}$/i.test(value) ? `${value.slice(0, 6)}…${value.slice(-4)}` : `${value.slice(0, max - 1)}…`;
}

export function networkData(nodes = [], edges = [], categories = []) {
  if (!Array.isArray(nodes) || !Array.isArray(edges)) throw new Error('nodes and edges must be arrays.');
  if (nodes.length > MAX_NODES) throw new Error(`NetworkGraph draws at most ${MAX_NODES} nodes; aggregate or filter the data first.`);
  if (edges.length > MAX_EDGES) throw new Error(`NetworkGraph draws at most ${MAX_EDGES} edges; aggregate or filter the data first.`);
  const ids = new Set();
  const cleanNodes = nodes.map(node => {
    const id = String(node?.id ?? '');
    if (!id || ids.has(id)) throw new Error('Node ids must be unique and non-empty.');
    ids.add(id);
    const details = (Array.isArray(node.details) ? node.details : [])
      .map(detail => ({ label: String(detail?.label ?? ''), value: detail?.value == null ? '' : String(detail.value) })).filter(detail => detail.value);
    return { id, label: String(node.label ?? id), sublabel: node.sublabel == null ? '' : String(node.sublabel), details,
      category: node.category == null ? '' : String(node.category), size: Math.max(0, finite(node.size) ?? 1), pinned: !!node.pinned, data: node };
  });
  const cleanEdges = edges.map(edge => {
    const source = String(edge?.source ?? ''), target = String(edge?.target ?? '');
    if (!ids.has(source) || !ids.has(target)) throw new Error('Every edge must reference an existing node id.');
    const direction = DIRECTIONS.has(edge.direction) ? edge.direction : 'forward';
    return { source, target, weight: Math.max(0, finite(edge.weight) ?? 1), direction, dashed: !!edge.dashed,
      label: edge.label == null ? '' : String(edge.label), data: edge };
  });
  const used = new Set(cleanNodes.map(node => node.category).filter(Boolean));
  const cleanCategories = (Array.isArray(categories) ? categories : []).map(category => ({ id: String(category?.id ?? ''), label: String(category?.label ?? category?.id ?? '') }))
    .filter(category => category.id);
  for (const id of used) if (!cleanCategories.some(category => category.id === id)) cleanCategories.push({ id, label: id });
  return { nodes: cleanNodes, edges: cleanEdges, categories: cleanCategories };
}

/** Builds the ECharts option and table rows. `theme` comes from readTheme(); tests pass {}. */
export function buildNetworkGraph(props = {}, theme = {}) {
  // Fixed nodes use canvas pixel coordinates; the component passes the measured centre. Tests and SSR use 400x180.
  const centre = { x: Number.isFinite(props.centerX) ? props.centerX : 400, y: Number.isFinite(props.centerY) ? props.centerY : 180 };
  const graph = networkData(props.nodes, props.edges, props.categories);
  const colors = Array.isArray(theme.colors) && theme.colors.length ? theme.colors : ['#7c3aed', '#0ea5e9', '#16a34a', '#f59e0b', '#ef4444', '#64748b'];
  const text = theme.text || '#1f2937', muted = theme.muted || '#6b7280', surface = theme.surface || '#ffffff';
  const sizes = graph.nodes.map(node => node.size), weights = graph.edges.map(edge => edge.weight);
  const [minSize, maxSize] = [Math.min(...sizes, 0), Math.max(...sizes, 1)];
  const [minWeight, maxWeight] = [Math.min(...weights, 0), Math.max(...weights, 1)];
  const categoryIndex = new Map(graph.categories.map((category, index) => [category.id, index]));
  const focusId = props.focusId == null ? null : String(props.focusId);
  const selectedId = props.selectedId == null ? null : String(props.selectedId);
  const maxLabel = Number.isFinite(props.maxLabelLength) ? Math.max(6, props.maxLabelLength) : 22;
  const count = graph.nodes.length;
  const data = graph.nodes.map(node => {
    const index = categoryIndex.get(node.category);
    const color = index == null ? muted : colors[index % colors.length];
    const focus = focusId != null && node.id === focusId;
    const size = focus ? Math.max(30, scale(node.size, minSize, maxSize, 22, 44)) : scale(node.size, minSize, maxSize, 14, 36);
    const displayName = truncateLabel(node.label, maxLabel);
    // The sublabel (address, email) is drawn under the name so it is readable without hovering.
    const displaySublabel = node.sublabel && node.sublabel !== node.label ? truncateLabel(node.sublabel, maxLabel) : '';
    // The tooltip only appears when it adds something: resolved details, or text the label had to shorten.
    // (An empty formatter result hides it; a per-node tooltip.show=false would leave the previous node's tooltip on screen.)
    const hasMore = node.details.length > 0 || displayName !== node.label || (!!displaySublabel && displaySublabel !== node.sublabel);
    return { id: node.id, name: node.id, displayName, displaySublabel, fullLabel: node.label, sublabel: node.sublabel, details: node.details, hasMore,
      value: node.size, category: index, symbolSize: size, symbol: focus ? 'circle' : 'circle',
      fixed: focus, ...(focus ? { x: centre.x, y: centre.y } : {}),
      itemStyle: { color, borderColor: selectedId === node.id ? text : surface, borderWidth: selectedId === node.id ? 3 : 1.5, shadowBlur: focus ? 12 : 0, shadowColor: color },
      label: { show: true, position: focus ? 'bottom' : 'right', fontWeight: focus ? 600 : 400 },
      select: { itemStyle: { borderColor: text, borderWidth: 3 } } };
  });
  const links = graph.edges.map(edge => ({ source: edge.source, target: edge.target, value: edge.weight, direction: edge.direction, kind: edge.data.kind ?? '',
    edgeLabel: edge.label,
    lineStyle: { width: scale(edge.weight, minWeight, maxWeight, 1.2, 5), type: edge.dashed ? 'dashed' : 'solid', curveness: edge.source === edge.target ? 0.4 : 0.12,
      color: muted, opacity: 0.55 },
    symbol: edge.direction === 'both' ? ['arrow', 'arrow'] : edge.direction === 'none' ? ['none', 'none'] : ['none', 'arrow'],
    symbolSize: [6, 8] }));
  const layout = props.layout === 'circular' ? 'circular' : 'force';
  const option = {
    color: colors,
    textStyle: { color: text },
    legend: { show: graph.categories.length > 1, top: 4, left: 4, selectedMode: false, icon: 'circle', itemWidth: 10, itemHeight: 10, textStyle: { color: muted, fontSize: 11 },
      data: graph.categories.map(category => category.label) },
    tooltip: { trigger: 'item', confine: true, backgroundColor: surface, borderColor: muted, textStyle: { color: text, fontSize: 12 },
      formatter: params => params.dataType === 'edge'
        ? `${escapeHtml(labelOf(graph, params.data.source))} → ${escapeHtml(labelOf(graph, params.data.target))}${params.data.edgeLabel ? `<br/>${escapeHtml(params.data.edgeLabel)}` : ''}`
        : !params.data.hasMore ? ''
        : `<strong>${escapeHtml(params.data.fullLabel)}</strong>${params.data.sublabel ? `<br/>${escapeHtml(params.data.sublabel)}` : ''}`
          + params.data.details.map(detail => `<br/><span style="color:${muted}">${escapeHtml(detail.label)}</span> ${escapeHtml(detail.value)}`).join('') },
    // cursor is set explicitly: draggable nodes otherwise show the move cursor, which hides that they are clickable.
    series: [{ type: 'graph', layout, roam: true, draggable: true, cursor: 'pointer', zoom: 1, top: graph.categories.length > 1 ? 40 : 12, bottom: 16, left: 24, right: 24,
      circular: { rotateLabel: false },
      force: { repulsion: clamp(1100 - count * 6, 260, 1100), gravity: 0.08, edgeLength: [90, clamp(120 + count * 3, 140, 260)], friction: 0.6, layoutAnimation: props.animate !== false && !props.reducedMotion },
      categories: graph.categories.map((category, index) => ({ name: category.label, itemStyle: { color: colors[index % colors.length] } })),
      data, links,
      selectedMode: 'single',
      label: { show: true, color: text, fontSize: 11, overflow: 'truncate', width: 140,
        formatter: params => params.data.displaySublabel ? `${params.data.displayName}\n{sub|${params.data.displaySublabel.replace(/[{}]/g, '')}}` : params.data.displayName,
        rich: { sub: { color: muted, fontSize: 10, fontWeight: 400, lineHeight: 14 } } },
      labelLayout: { hideOverlap: true },
      lineStyle: { color: muted, curveness: 0.12 },
      edgeSymbolSize: [6, 8],
      emphasis: { focus: 'adjacency', lineStyle: { width: 4, opacity: 0.9 }, label: { show: true } },
      blur: { itemStyle: { opacity: 0.15 }, lineStyle: { opacity: 0.08 }, label: { opacity: 0.2 } } }],
  };
  const nodeRows = graph.nodes.map((node, index) => ({ __row: index, id: node.id, label: node.label, sublabel: node.sublabel, category: graph.categories.find(category => category.id === node.category)?.label ?? '', size: node.size }));
  const edgeRows = graph.edges.map((edge, index) => ({ __row: index, source: labelOf(graph, edge.source), target: labelOf(graph, edge.target), direction: edge.direction, weight: edge.weight, label: edge.label }));
  return { option, nodeRows, edgeRows, legends: graph.categories.map(category => category.label), hasData: graph.nodes.length > 0 };
}
function labelOf(graph, id) { return graph.nodes.find(node => node.id === id)?.label ?? id; }
function escapeHtml(value) { return String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch])); }
