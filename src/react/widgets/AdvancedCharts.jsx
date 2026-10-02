import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Button, EmptyState, WidgetSkeleton } from './primitives.jsx';
import { DataTable } from './DataTable.jsx';
import { useReducedMotion } from './motion.js';
import { buildAdvancedChart } from './advanced-chart-model.js';
import { readTheme } from './chart-theme.js';

export function AdvancedChart({ kind, ...props }) {
  const {label='Chart',height=320,loading=false,error,showDataTable=true,animate=true,duration=700}=props;
  const host=useRef(null),container=useRef(null),chart=useRef(null);
  const [theme,setTheme]=useState({}),[ready,setReady]=useState(false),[failure,setFailure]=useState(''),[hidden,setHidden]=useState([]);
  const [retry,setRetry]=useState(0);
  const reduced=useReducedMotion();
  const model=useMemo(()=>{try{return buildAdvancedChart(kind,props,theme);}catch(error){return {error:error.message};}},
    [kind,props.data,props.series,props.xKey,props.yKey,props.labelKey,props.valueKey,props.sizeKey,props.xLabel,props.yLabel,
      props.bins,props.value,props.min,props.max,props.nodes,props.links,props.label,props.formatValue,theme]);
  const hasData=!!model.hasData,problem=error ? (error.message || String(error)) : model.error;
  useEffect(()=>{
    const element=container.current;if(!element)return;
    const update=()=>{const next=readTheme(element);setTheme(old=>JSON.stringify(old)===JSON.stringify(next)?old:next);};
    update();
    const observer=new MutationObserver(update);
    for(let ancestor=element;ancestor;ancestor=ancestor.parentElement) observer.observe(ancestor,{attributes:true,attributeFilter:['style','class','data-theme','data-density']});
    const media=window.matchMedia('(prefers-color-scheme: dark)');
    media.addEventListener('change',update);
    return()=>{observer.disconnect();media.removeEventListener('change',update);};
  },[]);
  useEffect(()=>{
    if(loading || !hasData || error || model.error) return;
    let cancelled=false,observer;
    setReady(false);setFailure('');
    import('./chart-engine.js').then(engine=>{
      if(cancelled || !host.current)return;
      const instance=engine.init(host.current,null,{renderer:'svg'});chart.current=instance;
      observer=new ResizeObserver(()=>instance.resize());observer.observe(host.current);
      setReady(true);
    }).catch(err=>{if(!cancelled)setFailure(err.message || 'Could not load the chart.');});
    return()=>{cancelled=true;observer?.disconnect();chart.current?.dispose();chart.current=null;};
  },[loading,hasData,!!error,model.error,retry]);
  useEffect(()=>{
    if(!ready || !chart.current || !model.option)return;
    try {
      const milliseconds=Number.isFinite(duration)?Math.max(0,Math.min(3000,duration)):700;
      const option={...model.option,animation:animate&&!reduced,animationDuration:milliseconds,animationDurationUpdate:Math.min(1000,milliseconds),
        textStyle:{...model.option.textStyle,fontFamily:theme.fontFamily},
        legend:{...model.option.legend,selected:Object.fromEntries(model.legends.map(name=>[name,!hidden.includes(name)]))}};
      chart.current.setOption(option,{notMerge:true});
      setFailure('');
    } catch(err) {setFailure(err.message || 'Could not draw the chart.');}
  },[ready,model,theme,animate,reduced,duration,hidden]);
  const chartHeight=Number.isFinite(height)?Math.max(180,height):320;
  return <section ref={container} className="cgw-chart cgw-advanced-chart" aria-label={label} aria-busy={loading || (hasData&&!ready&&!problem&&!failure)}>
    {loading ? <WidgetSkeleton variant="chart" /> : problem ? <Alert tone="danger" title="Could not display this chart">{problem}</Alert> : !hasData ?
      <EmptyState title="No chart data" description="Data will appear here when it is available." /> : <>
        {!!model.legends.length && <div className="cgw-chart-legend" aria-label="Chart series">{model.legends.map((name,index)=>
          <button key={name+index} type="button" aria-pressed={!hidden.includes(name)} onClick={()=>setHidden(old=>old.includes(name)?old.filter(item=>item!==name):[...old,name])}>
            <span style={{background:theme.colors?.[index%6] || 'rgb(var(--accent))'}} />{name}
          </button>)}</div>}
        {failure && <Alert tone="danger" title="Could not display this chart">{failure}<Button size="sm" variant="secondary" onClick={()=>{setFailure('');setRetry(value=>value+1);}}>Try again</Button></Alert>}
        <div className="cgw-chart-stage" style={{height:chartHeight,display:failure?'none':undefined}}>
          <div ref={host} className="cgw-chart-engine" style={{height:'100%'}} />
          {!ready && <div className="cgw-chart-engine-loading"><WidgetSkeleton variant="chart" /></div>}
        </div>
        {showDataTable && <details className="cgw-chart-data"><summary>View data · {label}</summary>
          <DataTable label={label+' data'} columns={model.columns} rows={model.rows} getRowId={row=>row.__chartRow} pageSize={10} />
        </details>}
      </>}
  </section>;
}
export function AreaChart(props) { return <AdvancedChart kind="area-chart" {...props} />; }
export function StackedAreaChart(props) { return <AdvancedChart kind="stacked-area-chart" {...props} />; }
export function StepLineChart(props) { return <AdvancedChart kind="step-line-chart" {...props} />; }
export function HorizontalBarChart(props) { return <AdvancedChart kind="horizontal-bar-chart" {...props} />; }
export function StackedBarChart(props) { return <AdvancedChart kind="stacked-bar-chart" {...props} />; }
export function PercentBarChart(props) { return <AdvancedChart kind="percent-bar-chart" {...props} />; }
export function PieChart(props) { return <AdvancedChart kind="pie-chart" {...props} />; }
export function RoseChart(props) { return <AdvancedChart kind="rose-chart" {...props} />; }
export function RadarChart(props) { return <AdvancedChart kind="radar-chart" {...props} />; }
export function ScatterChart(props) { return <AdvancedChart kind="scatter-chart" {...props} />; }
export function BubbleChart(props) { return <AdvancedChart kind="bubble-chart" {...props} />; }
export function HeatmapChart(props) { return <AdvancedChart kind="heatmap-chart" {...props} />; }
export function CalendarHeatmap(props) { return <AdvancedChart kind="calendar-heatmap" {...props} />; }
export function Histogram(props) { return <AdvancedChart kind="histogram" {...props} />; }
export function BoxPlotChart(props) { return <AdvancedChart kind="box-plot-chart" {...props} />; }
export function WaterfallChart(props) { return <AdvancedChart kind="waterfall-chart" {...props} />; }
export function RangeBarChart(props) { return <AdvancedChart kind="range-bar-chart" {...props} />; }
export function ComboChart(props) { return <AdvancedChart kind="combo-chart" {...props} />; }
export function CandlestickChart(props) { return <AdvancedChart kind="candlestick-chart" {...props} />; }
export function FunnelChart(props) { return <AdvancedChart kind="funnel-chart" {...props} />; }
export function GaugeChart(props) { return <AdvancedChart kind="gauge-chart" {...props} />; }
export function TreemapChart(props) { return <AdvancedChart kind="treemap-chart" {...props} />; }
export function SunburstChart(props) { return <AdvancedChart kind="sunburst-chart" {...props} />; }
export function SankeyChart(props) { return <AdvancedChart kind="sankey-chart" {...props} />; }
export function GraphChart(props) { return <AdvancedChart kind="graph-chart" {...props} />; }
