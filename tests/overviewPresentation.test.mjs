import test from 'node:test';
import assert from 'node:assert/strict';
import { overviewCategoryShare, overviewChartGuide } from '../utils/overviewPresentation.ts';
test('category bars retain exact fractions and do not claim tiny expenses are zero',()=>{
 assert.deepEqual(overviewCategoryShare(0,100),{percent:0,label:'0%'});
 assert.deepEqual(overviewCategoryShare(.01,100),{percent:.01,label:'<1%'});
 assert.deepEqual(overviewCategoryShare(2.49,100),{percent:2.49,label:'2,5%'});
 assert.deepEqual(overviewCategoryShare(100,100),{percent:100,label:'100%'});
 assert.deepEqual(overviewCategoryShare(1,0),{percent:0,label:'0%'});
});
test('a configured zero monthly budget is not replaced by an invented monthly plan',()=>{
 assert.equal(overviewChartGuide('month',0,2594.48,true).value,0);
 assert.equal(overviewChartGuide('month',null,2594.48,true).value,0);
 assert.equal(overviewChartGuide('month',100000,2594.48,true).value,100000);
 assert.equal(overviewChartGuide('month',100000,2594.48,false).value,0);
 assert.deepEqual(overviewChartGuide('day',100000,2594.48,true),{value:2594.48,label:'Ориентир на день'});
 assert.equal(overviewChartGuide('week',100000,2594.48,false).value,0);
});
