import { chartNumber } from './chart-model.js';
import { validDate } from './filter-model.js';

const finite = value => chartNumber(value);
const labelOf = value => String(value ?? '');
const column = (key, label = key) => ({key,label});
const defaultTheme = {colors:['#7355db','#158c91','#cb7d28','#ba567b','#5779b6','#6b8c53'],text:'#343448',muted:'#767689',border:'#e0e0ea',surface:'#ffffff',success:'#26936b',danger:'#d55166'};
export function histogramBins(values, requested) {
  const numbers = values.map(finite).filter(value => value !== null);
  if (!numbers.length) return [];
  const low = Math.min(...numbers), high = Math.max(...numbers);
  const count = low === high ? 1 : Math.max(1,Math.min(50,Math.floor(Number(requested) || Math.ceil(Math.sqrt(numbers.length)))));
  const width = low === high ? 1 : (high-low)/count;
  const bins = Array.from({length:count},(_,index)=>({low:low+index*width,high:low+(index+1)*width,count:0}));
  for (const number of numbers) bins[Math.min(count-1,Math.floor((number-low)/width))].count++;
  return bins;
}
export function boxStatistics(values) {
  const sorted = (values || []).map(finite).filter(value=>value!==null).sort((a,b)=>a-b);
  if (!sorted.length) return null;
  const quantile = p => { const i=(sorted.length-1)*p, start=Math.floor(i); return sorted[start]+(sorted[Math.ceil(i)]-sorted[start])*(i-start); };
  const q1=quantile(.25),median=quantile(.5),q3=quantile(.75),iqr=q3-q1;
  const inside=sorted.filter(value=>value>=q1-1.5*iqr && value<=q3+1.5*iqr);
  return {low:inside[0],q1,median,q3,high:inside.at(-1),outliers:sorted.filter(value=>value<inside[0] || value>inside.at(-1))};
}
export function graphData(nodes=[], links=[], acyclic=false) {
  const ids=new Set();
  const cleanNodes=nodes.map(node=>{
    const id=String(node.id ?? node.name ?? '');
    if(!id || ids.has(id)) throw new Error('Node IDs must be unique and non-empty.');
    ids.add(id); return {...node,id,name:id,displayName:node.name || id};
  });
  const cleanLinks=links.map(link=>{
    const source=String(link.source),target=String(link.target),value=finite(link.value);
    if(!ids.has(source) || !ids.has(target)) throw new Error('Every link must reference an existing node.');
    if(acyclic && (value===null || value<0)) throw new Error('Sankey links need non-negative numeric values.');
    return {source,target,value:value ?? 1};
  }).filter(link=>!acyclic || link.value>0);
  if(acyclic) {
    const visited=new Set(),active=new Set(),outgoing=new Map(cleanNodes.map(node=>[node.id,[]]));
    cleanLinks.forEach(link=>outgoing.get(link.source).push(link.target));
    const visit=id=>{ if(active.has(id)) throw new Error('Sankey flows cannot contain a cycle. Use Network graph for cyclic relationships.'); if(visited.has(id)) return;active.add(id);outgoing.get(id).forEach(visit);active.delete(id);visited.add(id); };
    cleanNodes.forEach(node=>visit(node.id));
  }
  return {nodes:cleanNodes,links:cleanLinks};
}
function hierarchyData(data, path=[], rows=[]) {
  const nodes=(data || []).map(node=>{
    const name=labelOf(node.name), children=hierarchyData(node.children,[...path,name],rows);
    const value=children.length ? children.reduce((sum,child)=>sum+child.value,0) : Math.max(0,finite(node.value) ?? 0);
    if(value>0) rows.push({path:[...path,name].join(' / '),value,kind:children.length?'Group total':'Leaf'});
    return {name,value,...(children.length?{children}:{})};
  });
  return nodes.filter(node=>node.value>0);
}

/** Normalizes chart data once for both plotting and the accessible/exportable table. */
export function buildAdvancedChart(kind, props={}, palette={}) {
  const theme={...defaultTheme,...palette}, data=Array.isArray(props.data)?props.data:[];
  const xKey=props.xKey || 'label', labelKey=props.labelKey || 'label', valueKey=props.valueKey || 'value';
  const measures=props.series || [], colors=theme.colors;
  const format=props.formatValue || (n=>new Intl.NumberFormat(undefined,{notation:'compact',maximumFractionDigits:1}).format(n));
  const axis={axisLine:{lineStyle:{color:theme.border}},axisTick:{show:false},axisLabel:{color:theme.muted,hideOverlap:true},splitLine:{lineStyle:{color:theme.border,type:'dashed'}}};
  const option={color:colors,textStyle:{color:theme.text,fontFamily:'inherit'},backgroundColor:'transparent',
    aria:{enabled:true,decal:{show:true},label:{description:props.label || 'Chart'}},
    tooltip:{trigger:'item',renderMode:'richText',confine:true,valueFormatter:value=>typeof value==='number'?format(value):String(value ?? '')},
    grid:{left:12,right:20,top:24,bottom:14,outerBoundsMode:'same',outerBoundsContain:'all'},
    xAxis:{...axis,type:'category',data:data.map(row=>labelOf(row[xKey])),splitLine:{show:false}},
    yAxis:{...axis,type:'value',axisLabel:{...axis.axisLabel,formatter:format}},series:[]};
  let rows=[], columns=[], legends=[], hasData=false;
  const noAxes=()=>{delete option.xAxis;delete option.yAxis;delete option.grid;};
  const table=(records,keys)=>{rows=records;columns=keys.map(key=>typeof key==='string'?column(key):key);hasData=records.length>0;};
  const categorical=['area-chart','stacked-area-chart','step-line-chart','horizontal-bar-chart','stacked-bar-chart','percent-bar-chart','combo-chart'];
  if(categorical.includes(kind)) {
    table(data.map(row=>Object.fromEntries([[xKey,labelOf(row[xKey])],...measures.map(series=>[series.key,finite(row[series.key])])])),[column(xKey,'Label'),...measures.map(series=>column(series.key,series.label))]);
    hasData=rows.some(row=>measures.some(series=>row[series.key]!==null));
    const percent=kind==='percent-bar-chart', stacked=kind.includes('stacked') || percent;
    if(percent && rows.some(row=>measures.some(series=>row[series.key]<0))) throw new Error('100% stacked bars require non-negative values.');
    option.series=measures.map((series,index)=>({name:series.label,type:kind==='combo-chart'?(series.type || (index?'line':'bar')):kind.includes('area') || kind.includes('step')?'line':'bar',
      data:rows.map(row=>percent ? ((row[series.key] || 0)/(measures.reduce((sum,item)=>sum+(row[item.key] || 0),0) || 1))*100 : row[series.key]),
      ...(stacked?{stack:'total'}:{}),...(kind.includes('area')?{areaStyle:{opacity:stacked?.5:.18},smooth:.25}:{}),
      ...(kind.includes('step')?{step:'end'}:{}),symbolSize:6,barMaxWidth:42,emphasis:{focus:'series'},connectNulls:false}));
    legends=measures.map(series=>series.label);
    if(percent) option.yAxis={...option.yAxis,max:100,axisLabel:{...axis.axisLabel,formatter:n=>`${n}%`}};
    if(kind==='horizontal-bar-chart') {const category=option.xAxis;option.xAxis=option.yAxis;option.yAxis={...category,inverse:true};}
    option.tooltip.trigger='axis';
  } else if(['pie-chart','rose-chart','funnel-chart'].includes(kind)) {
    const values=data.map(row=>({name:labelOf(row[labelKey]),value:finite(row[valueKey])})).filter(row=>row.value>0);
    noAxes();table(values,[column('name','Label'),column('value','Value')]);legends=values.map(row=>row.name);
    option.series=[kind==='funnel-chart'?{type:'funnel',left:'15%',right:'15%',top:16,bottom:16,sort:'descending',gap:4,data:values,label:{position:'inside',color:theme.text,backgroundColor:theme.surface,padding:[3,5],borderRadius:3}}:
      {type:'pie',radius:kind==='rose-chart'?['12%','72%']:'70%',center:['50%','50%'],roseType:kind==='rose-chart'?'area':undefined,data:values,
        label:{color:theme.text,overflow:'truncate',width:100},labelLayout:{hideOverlap:true},itemStyle:{borderColor:theme.surface,borderWidth:3,borderRadius:4}}];
  } else if(kind==='radar-chart') {
    noAxes();table(data.map(row=>({...row})),[column(xKey,'Measure'),...measures.map(series=>column(series.key,series.label))]);
    hasData=data.length>=3 && measures.length>0 && data.some(row=>measures.some(series=>finite(row[series.key])!==null));
    option.radar={indicator:data.map(row=>({name:labelOf(row[xKey]),max:Math.max(1,...measures.map(series=>Math.max(0,finite(row[series.key]) || 0)))*1.15})),radius:'65%',axisName:{color:theme.muted},splitArea:{show:false},splitLine:{lineStyle:{color:theme.border}},axisLine:{lineStyle:{color:theme.border}}};
    option.series=[{type:'radar',data:measures.map(series=>({name:series.label,value:data.map(row=>Math.max(0,finite(row[series.key]) || 0)),areaStyle:{opacity:.12}}))}];
    legends=measures.map(series=>series.label);
  } else if(['scatter-chart','bubble-chart'].includes(kind)) {
    const x=props.xKey || 'x', y=props.yKey || 'y',size=props.sizeKey || 'size';
    table(data.map(row=>({label:labelOf(row[labelKey]),x:finite(row[x]),y:finite(row[y]),size:finite(row[size])})).filter(row=>row.x!==null && row.y!==null),[column('label','Label'),column('x',props.xLabel || x),column('y',props.yLabel || y),...(kind==='bubble-chart'?[column('size','Size')]:[])]);
    option.xAxis={...axis,type:'value',name:props.xLabel || x,scale:true};option.yAxis={...option.yAxis,name:props.yLabel || y,scale:true};
    const maximum=Math.max(1,...rows.map(row=>row.size || 0));
    option.series=[{type:'scatter',data:rows.map(row=>({name:row.label,value:[row.x,row.y,row.size]})),symbolSize:kind==='bubble-chart'?value=>8+Math.sqrt(Math.max(0,value[2] || 0)/maximum)*40:11,itemStyle:{opacity:.75},emphasis:{scale:1.2}}];
  } else if(['heatmap-chart','calendar-heatmap'].includes(kind)) {
    const calendar=kind==='calendar-heatmap';
    table(data.map(row=>calendar?{date:labelOf(row.date),value:finite(row[valueKey])}:{x:labelOf(row.x),y:labelOf(row.y),value:finite(row[valueKey])}).filter(row=>row.value!==null && (!calendar || validDate(row.date))),calendar?[column('date','Date'),column('value','Value')]:[column('x','Column'),column('y','Row'),column('value','Value')]);
    const low=Math.min(0,...rows.map(row=>row.value)),high=Math.max(1,...rows.map(row=>row.value));
    option.aria.decal.show=false;
    option.visualMap={min:low,max:high,calculable:false,orient:'horizontal',left:'center',bottom:0,text:[format(high),format(low)],textStyle:{color:theme.muted},inRange:{color:[theme.surface,colors[0]]}};
    if(calendar) {
      noAxes();const dates=rows.map(row=>row.date).sort();
      option.calendar={range:dates.length?[dates[0],dates.at(-1)]:['2026-01-01','2026-01-31'],top:35,left:45,right:15,bottom:70,cellSize:['auto',22],yearLabel:{show:false},dayLabel:{color:theme.muted},monthLabel:{color:theme.muted},itemStyle:{borderColor:theme.surface,borderWidth:3,color:theme.border},splitLine:{show:false}};
      option.series=[{type:'heatmap',coordinateSystem:'calendar',data:rows.map(row=>[row.date,row.value])}];
    } else {
      const xs=[...new Set(rows.map(row=>row.x))],ys=[...new Set(rows.map(row=>row.y))];
      option.xAxis={...option.xAxis,data:xs};option.yAxis={...axis,type:'category',data:ys,splitLine:{show:false}};option.grid.bottom=65;
      option.series=[{type:'heatmap',data:rows.map(row=>[xs.indexOf(row.x),ys.indexOf(row.y),row.value]),label:{show:true,color:theme.text,backgroundColor:theme.surface,padding:[2,4],borderRadius:3},itemStyle:{borderColor:theme.surface,borderWidth:3,borderRadius:3}}];
    }
  } else if(kind==='histogram') {
    const bins=histogramBins(data.map(row=>typeof row==='number'?row:row[valueKey]),props.bins);
    table(bins,[column('low','From (inclusive)'),column('high','To (last bin inclusive)'),column('count','Count')]);
    option.xAxis.data=bins.map(bin=>`${format(bin.low)}–${format(bin.high)}`);
    option.series=[{type:'bar',barCategoryGap:'3%',data:bins.map(bin=>bin.count),itemStyle:{borderRadius:[3,3,0,0]}}];
  } else if(kind==='box-plot-chart') {
    table(data.map(row=>({label:labelOf(row[labelKey]),...boxStatistics(row.values)})).filter(row=>row.median!==undefined),['label','low','q1','median','q3','high',column('outliers','Outliers')]);
    option.xAxis.data=rows.map(row=>row.label);
    option.series=[{type:'boxplot',data:rows.map(row=>[row.low,row.q1,row.median,row.q3,row.high]),itemStyle:{color:theme.surface,borderColor:colors[0]}},
      {type:'scatter',data:rows.flatMap((row,index)=>row.outliers.map(value=>[index,value])),symbolSize:7}];
    rows=rows.map(row=>({...row,outliers:row.outliers.join(', ')}));
  } else if(['waterfall-chart','range-bar-chart'].includes(kind)) {
    let cumulative=0;
    table(data.map(row=>{
      if(kind==='range-bar-chart') return {label:labelOf(row[labelKey]),start:finite(row.start),end:finite(row.end)};
      const value=finite(row[valueKey]);if(value===null) return null;
      const start=row.total?0:cumulative,end=row.total?value:cumulative+value;cumulative=end;
      return {label:labelOf(row[labelKey]),start,end,change:end-start,total:!!row.total};
    }).filter(row=>row && row.start!==null && row.end!==null),['label','start','end',...(kind==='waterfall-chart'?['change']:[])]);
    if(kind==='range-bar-chart' && rows.some(row=>row.start>row.end)) throw new Error('Each range must end at or after its start.');
    option.xAxis.data=rows.map(row=>row.label);
    // A custom floating bar works across zero, unlike transparent stacked baselines.
    option.series=[{type:'custom',encode:{x:0,y:[1,2]},data:rows.map((row,index)=>[index,row.start,row.end]),renderItem:(params,api)=>{
      const index=api.value(0),start=api.coord([index,api.value(1)]),end=api.coord([index,api.value(2)]),width=Math.min(42,api.size([1,0])[0]*.65);
      return {type:'rect',shape:{x:start[0]-width/2,y:Math.min(start[1],end[1]),width,height:Math.max(2,Math.abs(start[1]-end[1])),r:3},style:{fill:kind==='range-bar-chart' || rows[index]?.total?colors[0]:api.value(2)>=api.value(1)?theme.success:theme.danger}};
    }}];
  } else if(kind==='candlestick-chart') {
    table(data.map(row=>({label:labelOf(row[labelKey]),open:finite(row.open),close:finite(row.close),low:finite(row.low),high:finite(row.high)})).filter(row=>[row.open,row.close,row.low,row.high].every(value=>value!==null)),['label','open','close','low','high']);
    if(rows.some(row=>row.low>Math.min(row.open,row.close) || row.high<Math.max(row.open,row.close))) throw new Error('Candlestick low/high must enclose both open and close.');
    option.xAxis.data=rows.map(row=>row.label);option.yAxis.scale=true;
    option.series=[{type:'candlestick',data:rows.map(row=>[row.open,row.close,row.low,row.high]),itemStyle:{color:theme.success,color0:theme.danger,borderColor:theme.success,borderColor0:theme.danger},barMaxWidth:35}];
  } else if(kind==='gauge-chart') {
    noAxes();const value=finite(props.value),min=finite(props.min) ?? 0,max=finite(props.max) ?? 100;
    if(max<=min) throw new Error('Gauge maximum must exceed its minimum.');
    table(value===null?[]:[{label:props.label || 'Value',value,min,max}],['label','value','min','max']);
    option.series=[{type:'gauge',min,max,startAngle:210,endAngle:-30,radius:'85%',center:['50%','57%'],progress:{show:true,width:16,roundCap:true},axisLine:{lineStyle:{width:16,color:[[1,theme.border]]},roundCap:true},pointer:{show:false},axisTick:{show:false},splitLine:{show:false},axisLabel:{color:theme.muted,distance:24},title:{show:false},detail:{valueAnimation:true,formatter:format,color:theme.text,fontSize:36,offsetCenter:[0,'5%']},data:value===null?[]:[{value:Math.max(min,Math.min(max,value)),name:props.label}],tooltip:{show:false}}];
    if(value!==null && (value<min || value>max)) option.series[0].detail.formatter=()=>format(value);
  } else if(['treemap-chart','sunburst-chart'].includes(kind)) {
    noAxes();const flat=[],tree=hierarchyData(data,[],flat);table(flat,['path','value','kind']);
    option.series=[{type:kind==='treemap-chart'?'treemap':'sunburst',data:tree,roam:false,nodeClick:false,sort:null,
      ...(kind==='treemap-chart'?{breadcrumb:{show:false},left:4,right:4,top:4,bottom:4,visibleMin:10,label:{formatter:'{b}',color:theme.text,backgroundColor:theme.surface,padding:[3,5],borderRadius:3},upperLabel:{show:true,height:24,color:theme.text,backgroundColor:theme.surface},itemStyle:{borderColor:theme.surface,borderWidth:3,gapWidth:3}}:
        {radius:['12%','92%'],label:{color:theme.text,rotate:'radial',minAngle:15},itemStyle:{borderColor:theme.surface,borderWidth:2}})}];
  } else if(['sankey-chart','graph-chart'].includes(kind)) {
    noAxes();const graph=graphData(props.nodes,props.links,kind==='sankey-chart');table(graph.links,[column('source','Source'),column('target','Target'),column('value','Value')]);
    hasData=graph.nodes.length>0 && (kind==='graph-chart' || graph.links.length>0);
    const label={color:theme.text,formatter:params=>params.data.displayName || params.name};
    option.series=[kind==='sankey-chart'?{type:'sankey',data:graph.nodes,links:graph.links,left:15,right:110,top:20,bottom:20,emphasis:{focus:'adjacency'},lineStyle:{color:'gradient',curveness:.5,opacity:.3},label,nodeWidth:16,nodeGap:18}:
      {type:'graph',layout:'circular',roam:false,data:graph.nodes.map((node,index)=>({...node,symbolSize:Math.max(24,Math.min(60,Math.sqrt(Math.max(1,finite(node.value)||9))*8)),itemStyle:{color:colors[index%colors.length]}})),links:graph.links,label:{...label,show:true,position:'bottom'},edgeSymbol:['none','arrow'],edgeSymbolSize:7,lineStyle:{color:theme.muted,opacity:.45,curveness:.12},emphasis:{focus:'adjacency'},top:40,bottom:65,left:80,right:80}];
  } else throw new Error(`Unknown chart type: ${kind}`);
  option.legend={show:false,data:legends};
  rows=rows.map((row,index)=>({...row,__chartRow:index}));
  return {option,rows,columns,legends,hasData};
}
