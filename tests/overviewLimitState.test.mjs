import test from 'node:test';
import assert from 'node:assert/strict';
import {overviewLimitState} from '../utils/overviewLimitState.ts';
test('monthly status follows exact limit including 80%, exact exhaustion and one kopeck over',()=>{
 assert.equal(overviewLimitState(1,0),null);
 for(const [spent,limit,status] of [[79.99,100,'normal'],[80,100,'near'],[100,100,'exhausted'],[100.01,100,'over'],[.3,.3,'exhausted']])assert.equal(overviewLimitState(spent,limit).status,status);
 assert.deepEqual(overviewLimitState(100.01,100),{status:'over',percentage:100.01,barWidth:100,difference:.01});
 const dense=overviewLimitState(874989.61,110000);assert.equal(dense.status,'over');assert.equal(dense.barWidth,100);assert.equal(dense.difference,764989.61);
});
