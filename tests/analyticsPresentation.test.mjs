import test from 'node:test';
import assert from 'node:assert/strict';
import {chartBarPercent} from '../utils/analyticsPresentation.ts';
test('zero, negative and nonfinite values do not invent chart volume',()=>{
 for(const v of [0,-1,NaN,Infinity])assert.equal(chartBarPercent(v,100),0);
 assert.equal(chartBarPercent(10,0),0);
});
test('small positive values keep their actual share instead of a decorative minimum',()=>{
 assert.equal(chartBarPercent(1,100),1);
 assert.equal(chartBarPercent(25,100),25);
 assert.equal(chartBarPercent(120,100),100);
});
