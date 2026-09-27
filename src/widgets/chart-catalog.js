import {advancedChartIndex} from './chart-index.js';
import {chartSamples,chartDescriptions} from './chart-examples.js';
const specific = {
  "area-chart": [
    "data / series / xKey",
    "Record[] / ChartSeries[] / string",
    "Ordered records; series keys select measures. xKey defaults to label. Nulls create gaps."
  ],
  "stacked-area-chart": [
    "data / series / xKey",
    "Record[] / ChartSeries[] / string",
    "Ordered records; series keys select measures. xKey defaults to label. Nulls create gaps."
  ],
  "step-line-chart": [
    "data / series / xKey",
    "Record[] / ChartSeries[] / string",
    "Ordered records; series keys select measures. xKey defaults to label. Nulls create gaps."
  ],
  "horizontal-bar-chart": [
    "data / series / xKey",
    "Record[] / ChartSeries[] / string",
    "Ordered records; series keys select measures. xKey defaults to label. Nulls create gaps."
  ],
  "stacked-bar-chart": [
    "data / series / xKey",
    "Record[] / ChartSeries[] / string",
    "Ordered records; series keys select measures. xKey defaults to label. Nulls create gaps."
  ],
  "percent-bar-chart": [
    "data / series / xKey",
    "Record[] / ChartSeries[] / string",
    "Ordered records; series keys select measures. xKey defaults to label. Nulls create gaps."
  ],
  "pie-chart": [
    "data / labelKey / valueKey",
    "Record[] / string",
    "Defaults label/value; only positive finite values are drawn. Keep category labels unique."
  ],
  "rose-chart": [
    "data / labelKey / valueKey",
    "Record[] / string",
    "Defaults label/value; only positive finite values are drawn. Keep category labels unique."
  ],
  "radar-chart": [
    "data / series / xKey",
    "Record[] / ChartSeries[]",
    "At least three dimension rows, each with numeric series measures. Non-negative magnitudes; missing values become zero. Each spoke has its own data-derived range."
  ],
  "scatter-chart": [
    "data / xKey / yKey / sizeKey",
    "Record[] / string",
    "Finite x/y values; defaults x, y, size. Bubble area scales with non-negative size. labelKey defaults to label. xLabel/yLabel name axes."
  ],
  "bubble-chart": [
    "data / xKey / yKey / sizeKey",
    "Record[] / string",
    "Finite x/y values; defaults x, y, size. Bubble area scales with non-negative size. labelKey defaults to label. xLabel/yLabel name axes."
  ],
  "heatmap-chart": [
    "data",
    "{x,y,value}[]",
    "Category coordinates and finite numeric values. Use one record per cell."
  ],
  "calendar-heatmap": [
    "data",
    "{date,value}[]",
    "YYYY-MM-DD dates and finite values. Use a bounded date window, such as one year, and one record per day."
  ],
  "histogram": [
    "data / bins / valueKey",
    "(number|Record)[] / number / string",
    "Raw observations; bins defaults to sqrt(n), bounded 1–50. valueKey defaults to value. Bins are equal width, with an inclusive upper edge on the last bin."
  ],
  "box-plot-chart": [
    "data / labelKey",
    "{label,values:number[]}[] / string",
    "Raw samples per category. Computes interpolated quartiles, median, 1.5×IQR whiskers and outliers."
  ],
  "waterfall-chart": [
    "data / labelKey / valueKey",
    "{label,value,total?:boolean}[] / string",
    "Values add to the running total. total:true sets an absolute total. Changes can cross zero; the data table includes start/end values."
  ],
  "range-bar-chart": [
    "data / labelKey",
    "{label,start:number,end:number}[] / string",
    "Numeric intervals. End must be at least start; missing intervals are omitted."
  ],
  "combo-chart": [
    "data / series / xKey",
    "Record[] / (ChartSeries & {type?:line|bar})[]",
    "Same units share a single axis. Defaults to bars for the first measure and lines for later measures."
  ],
  "candlestick-chart": [
    "data / labelKey",
    "{label,open,close,low,high}[] / string",
    "All four finite prices required. Low/high must enclose open and close."
  ],
  "funnel-chart": [
    "data / labelKey / valueKey",
    "Record[] / string",
    "Defaults label/value; only positive finite values are drawn. Keep category labels unique."
  ],
  "gauge-chart": [
    "value / min / max",
    "number | null / number",
    "Bounds default 0–100. The arc clamps to the bounds; the readout and table retain the actual value. Null shows the empty state."
  ],
  "treemap-chart": [
    "data",
    "HierarchyNode[]",
    "{name,value?,children?}. Leaves need positive values. Parent totals are derived from children; group rows in exports are subtotals."
  ],
  "sunburst-chart": [
    "data",
    "HierarchyNode[]",
    "{name,value?,children?}. Leaves need positive values. Parent totals are derived from children; group rows in exports are subtotals."
  ],
  "sankey-chart": [
    "nodes / links",
    "GraphNode[] / GraphLink[]",
    "Unique node id, optional name/value. Links use source/target IDs and positive values. Sankey rejects cycles and missing endpoints; Network graph allows cycles."
  ],
  "graph-chart": [
    "nodes / links",
    "GraphNode[] / GraphLink[]",
    "Unique node id, optional name/value. Links use source/target IDs and positive values. Sankey rejects cycles and missing endpoints; Network graph allows cycles."
  ]
};
export const advancedChartWidgets=advancedChartIndex.map(metadata=>({
  ...metadata,exports:[metadata.exportName],description:chartDescriptions[metadata.id],
  props:[
    {name:specific[metadata.id][0],type:specific[metadata.id][1],description:specific[metadata.id][2]},
    {name:'label / height / formatValue',type:'string / number / (number)=>string',description:'Accessible name, responsive height (320px default) and value formatting. Keep units consistent within one chart.'},
    {name:'loading / error',type:'boolean / Error | string',description:'Loading skeleton and caller-provided error. Empty or invalid data receives feedback.'},
    {name:'animate / duration',type:'boolean / number',description:'Animation is on by default (700ms). Respects reduced motion; maximum duration 3000ms.'},
    {name:'showDataTable',type:'boolean',description:'Defaults true: expandable accessible table with sorting, pagination and Excel export. Keep this enabled as an alternative to pointer tooltips.'},
  ],
  example:`import { ${metadata.exportName} } from '@cloudgatedevs/cloudgate-client-react/react/widgets';\nconst chartProps = ${JSON.stringify(chartSamples[metadata.id],null,2)};\nexport default function Example() { return <${metadata.exportName} {...chartProps} />; }`,
}));

