import * as Charts from '../widgets/AdvancedCharts.jsx';
import { advancedChartIndex } from '../../widgets/chart-index.js';
import { chartSamples } from '../../widgets/chart-examples.js';
export function WidgetCharts({id,state}) {
  const metadata=advancedChartIndex.find(item=>item.id===id),Chart=Charts[metadata.exportName];
  const sample=chartSamples[id];
  return <Chart {...sample} loading={state==='loading'} error={state==='error'?'The sample chart service is unavailable. Switch to Ready to try again.':undefined}
    {...(state==='empty'?{data:[],nodes:[],links:[],value:null}:{})} />;
}
