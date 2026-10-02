import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Button, EmptyState, WidgetSkeleton } from './primitives.jsx';
import { DataTable } from './DataTable.jsx';
import { useReducedMotion } from './motion.js';
import { readTheme } from './chart-theme.js';
import { buildNetworkGraph } from './network-graph-model.js';

const NODE_COLUMNS = [
  { key: 'label', label: 'Node', sortable: true }, { key: 'sublabel', label: 'Detail' },
  { key: 'category', label: 'Category', sortable: true }, { key: 'size', label: 'Size', sortable: true },
];
const EDGE_COLUMNS = [
  { key: 'source', label: 'From', sortable: true }, { key: 'target', label: 'To', sortable: true },
  { key: 'direction', label: 'Direction' }, { key: 'weight', label: 'Weight', sortable: true }, { key: 'label', label: 'Detail' },
];

/**
 * Force-directed relationship graph on the shared chart engine. Nodes carry a category (legend +
 * colour), a size and a resolved display label; edges carry weight, direction and an optional
 * dashed style. The focus node is pinned at the centre. Selection is controlled through
 * selectedId/onSelect so the page can drive a details panel or a table from the same state.
 */
export function NetworkGraph(props) {
  const { label = 'Network graph', height = 360, loading = false, error, showDataTable = true, animate = true,
    selectedId = null, onSelect, onEdgeSelect, emptyTitle = 'No relationships to show', emptyDescription = 'Widen the date range or filters to load relationships.',
    fitLabel = 'Fit to view', hint = 'Scroll to zoom · drag to pan' } = props;
  const host = useRef(null), container = useRef(null), chart = useRef(null), handlers = useRef({});
  const [theme, setTheme] = useState({}), [ready, setReady] = useState(false), [failure, setFailure] = useState(''), [retry, setRetry] = useState(0);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const reduced = useReducedMotion();
  handlers.current = { onSelect, onEdgeSelect };
  const model = useMemo(() => {
    try { return buildNetworkGraph({ ...props, reducedMotion: reduced, centerX: size.width ? size.width / 2 : undefined, centerY: size.height ? size.height / 2 + 12 : undefined }, theme); }
    catch (err) { return { error: err.message }; }
  }, [props.nodes, props.edges, props.categories, props.focusId, props.layout, props.maxLabelLength, selectedId, animate, reduced, theme, size.width, size.height]);
  const hasData = !!model.hasData, problem = error ? (error.message || String(error)) : model.error;
  useEffect(() => {
    const element = container.current; if (!element) return;
    const update = () => { const next = readTheme(element); setTheme(old => JSON.stringify(old) === JSON.stringify(next) ? old : next); };
    update();
    const observer = new MutationObserver(update);
    for (let ancestor = element; ancestor; ancestor = ancestor.parentElement) observer.observe(ancestor, { attributes: true, attributeFilter: ['style', 'class', 'data-theme', 'data-density'] });
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    media.addEventListener('change', update);
    return () => { observer.disconnect(); media.removeEventListener('change', update); };
  }, []);
  useEffect(() => {
    if (loading || !hasData || error || model.error) return;
    let cancelled = false, observer;
    setReady(false); setFailure('');
    import('./chart-engine.js').then(engine => {
      if (cancelled || !host.current) return;
      const instance = engine.init(host.current, null, { renderer: 'canvas' }); chart.current = instance;
      instance.on('click', params => {
        if (params.dataType === 'node') handlers.current.onSelect?.(params.data.id, params.data);
        else if (params.dataType === 'edge') handlers.current.onEdgeSelect?.(params.data.source, params.data.target, params.data);
      });
      // Clicking empty canvas clears the selection, matching the table behaviour.
      instance.getZr().on('click', event => { if (!event.target) handlers.current.onSelect?.(null, null); });
      const measure = () => setSize(old => { const next = { width: host.current?.clientWidth || 0, height: host.current?.clientHeight || 0 }; return old.width === next.width && old.height === next.height ? old : next; });
      observer = new ResizeObserver(() => { instance.resize(); measure(); }); observer.observe(host.current); measure();
      setReady(true);
    }).catch(err => { if (!cancelled) setFailure(err.message || 'Could not load the graph.'); });
    return () => { cancelled = true; observer?.disconnect(); chart.current?.dispose(); chart.current = null; };
  }, [loading, hasData, !!error, model.error, retry]);
  useEffect(() => {
    if (!ready || !chart.current || !model.option) return;
    try {
      chart.current.setOption({ ...model.option, animation: animate && !reduced, animationDuration: 500, animationDurationUpdate: 300,
        textStyle: { ...model.option.textStyle, fontFamily: theme.fontFamily } }, { notMerge: true });
      setFailure('');
    } catch (err) { setFailure(err.message || 'Could not draw the graph.'); }
  }, [ready, model, theme, animate, reduced]);
  const chartHeight = Number.isFinite(height) ? Math.max(220, height) : 360;
  function fit() { chart.current?.dispatchAction({ type: 'restore' }); chart.current?.setOption(model.option, { notMerge: true }); }
  return <section ref={container} className="cgw-chart cgw-advanced-chart cgw-network-graph" aria-label={label} aria-busy={loading || (hasData && !ready && !problem && !failure)}>
    {loading ? <WidgetSkeleton variant="chart" height={chartHeight} /> : problem ? <Alert tone="danger" title="Could not display this graph">{problem}</Alert> : !hasData
      ? <EmptyState title={emptyTitle} description={emptyDescription} />
      : <>
        <div className="cgw-network-graph-toolbar"><Button size="sm" variant="ghost" onClick={fit} disabled={!ready}>{fitLabel}</Button></div>
        {failure && <Alert tone="danger" title="Could not display this graph">{failure}<Button size="sm" variant="secondary" onClick={() => { setFailure(''); setRetry(value => value + 1); }}>Try again</Button></Alert>}
        <div className="cgw-chart-stage cgw-network-graph-canvas" style={{ height: chartHeight, display: failure ? 'none' : undefined }}>
          <div ref={host} className="cgw-chart-engine" style={{ height: '100%' }} />
          {!ready && <div className="cgw-chart-engine-loading"><WidgetSkeleton variant="chart" /></div>}
          {ready && hint && <span className="cgw-network-graph-hint" aria-hidden="true">{hint}</span>}
        </div>
        {showDataTable && <details className="cgw-chart-data"><summary>View data · {label}</summary>
          <DataTable label={label + ' nodes'} columns={NODE_COLUMNS} rows={model.nodeRows} getRowId={row => row.__row} pageSize={10} />
          <DataTable label={label + ' relationships'} columns={EDGE_COLUMNS} rows={model.edgeRows} getRowId={row => row.__row} pageSize={10} />
        </details>}
      </>}
  </section>;
}
