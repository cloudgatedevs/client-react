import test from 'node:test';
import assert from 'node:assert/strict';
import {buildAdvancedChart,histogramBins,boxStatistics,graphData} from '../src/react/widgets/advanced-chart-model.js';
import {chartSamples} from '../src/widgets/chart-examples.js';
import {advancedChartIndex} from '../src/widgets/chart-index.js';
import {init} from '../src/react/widgets/chart-engine.js';

test('every additional chart renders a finite SVG and exposes exportable data',()=>{
  assert.equal(advancedChartIndex.length,25);
  for(const {id} of advancedChartIndex) {
    const model=buildAdvancedChart(id,chartSamples[id]);
    assert.equal(model.hasData,true,id);assert.ok(model.rows.length,id);
    const instance=init(null,null,{renderer:'svg',ssr:true,width:900,height:320});
    try {
      instance.setOption({...model.option,animation:false,aria:{enabled:false}});
      const svg=instance.renderToSVGString();
      assert.match(svg,/<svg/);assert.doesNotMatch(svg,/NaN|Infinity/,id);assert.ok(svg.length>500,id);
    } finally {instance.dispose();}
    const empty=buildAdvancedChart(id,{...chartSamples[id],data:[],nodes:[],links:[],value:null});
    assert.equal(empty.hasData,false,id);
  }
});
test('histograms conserve observations including the upper boundary and constant samples',()=>{
  const bins=histogramBins([0,1,2,3,4,null,'bad'],2);
  assert.deepEqual(bins.map(bin=>bin.count),[2,3]);
  assert.deepEqual(histogramBins([7,7,7],10).map(bin=>bin.count),[3]);
});
test('box plots derive quartiles and isolate outliers',()=>{
  const result=boxStatistics([1,2,3,4,5,6,7,8,9,100]);
  assert.equal(result.median,5.5);assert.equal(result.q1,3.25);assert.equal(result.q3,7.75);
  assert.equal(result.high,9);assert.deepEqual(result.outliers,[100]);
});
test('waterfalls cross zero and explicit totals restart accumulation',()=>{
  const model=buildAdvancedChart('waterfall-chart',{data:[{label:'Start',value:5},{label:'Drop',value:-9},{label:'Total',value:-4,total:true},{label:'Recovery',value:7}]});
  assert.deepEqual(model.rows.map(row=>[row.start,row.end]),[[0,5],[5,-4],[0,-4],[-4,3]]);
});
test('normalized bars reject negative measures and sum to 100',()=>{
  const props={data:[{label:'A',a:1,b:3},{label:'B',a:0,b:0}],series:[{key:'a',label:'A'},{key:'b',label:'B'}]};
  assert.deepEqual(buildAdvancedChart('percent-bar-chart',props).option.series.map(series=>series.data),[[25,0],[75,0]]);
  assert.throws(()=>buildAdvancedChart('percent-bar-chart',{...props,data:[{a:-1,b:3}]}),/non-negative/);
});
test('invalid ranges, prices and cyclic flows give useful validation instead of corrupt geometry',()=>{
  assert.throws(()=>buildAdvancedChart('range-bar-chart',{data:[{start:9,end:1}]}),/end/);
  assert.throws(()=>buildAdvancedChart('candlestick-chart',{data:[{open:5,close:10,low:1,high:8}]}),/enclose/);
  const nodes=[{id:'a'},{id:'b'}],links=[{source:'a',target:'b',value:2},{source:'b',target:'a',value:1}];
  assert.throws(()=>graphData(nodes,links,true),/cycle/);assert.equal(graphData(nodes,links).links.length,2);
  assert.throws(()=>graphData(nodes,[{source:'a',target:'missing',value:1}],true),/existing/);
});
