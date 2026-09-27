import * as echarts from 'echarts/core';
import { LineChart, BarChart, PieChart, RadarChart, ScatterChart, HeatmapChart, BoxplotChart, CandlestickChart, FunnelChart, GaugeChart, TreemapChart, SunburstChart, SankeyChart, GraphChart, CustomChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, LegendComponent, RadarComponent, VisualMapComponent, CalendarComponent, AriaComponent } from 'echarts/components';
import { SVGRenderer } from 'echarts/renderers';
import { LabelLayout } from 'echarts/features';
echarts.use([LineChart,BarChart,PieChart,RadarChart,ScatterChart,HeatmapChart,BoxplotChart,CandlestickChart,FunnelChart,GaugeChart,TreemapChart,SunburstChart,SankeyChart,GraphChart,CustomChart,GridComponent,TooltipComponent,LegendComponent,RadarComponent,VisualMapComponent,CalendarComponent,AriaComponent,SVGRenderer,LabelLayout]);
export const init = echarts.init;
