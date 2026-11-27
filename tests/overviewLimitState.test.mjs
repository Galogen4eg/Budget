import test from 'node:test';
import assert from 'node:assert/strict';
import {overviewLimitState} from '../utils/overviewLimitState.ts';
test('monthly status follows exact limit including 80%, exact exhaustion and one kopeck over',()=>{
 assert.equal(overviewLimitState(1,0),null);
 for(const [spent,limit,status] of [[79.99,100,'normal'],[80,100,'near'],[100,100,'exhausted'],[100.01,100,'over'],[.3,.3,'exhausted']])assert.equal(overviewLimitState(spent,limit).status,status);
 const oneKopeck=overviewLimitState(100.01,100);
 assert.equal(oneKopeck.status,'over');assert.equal(oneKopeck.barWidth,100);assert.equal(oneKopeck.difference,.01);assert.ok(Math.abs(oneKopeck.percentage-100.01)<1e-10);
 const dense=overviewLimitState(874989.61,110000);assert.equal(dense.status,'over');assert.equal(dense.barWidth,100);assert.equal(dense.difference,764989.61);
});
