import test from 'node:test';
import assert from 'node:assert/strict';
import {formatSignedBudgetMoney} from '../utils/budgetFinancialMath.ts';
import {overviewLimitState} from '../utils/overviewLimitState.ts';
test('overview drilldown retains kopecks and masks sign and currency in privacy',()=>{
 assert.equal(formatSignedBudgetMoney(123.45,false,true),'+123,45 ₽');
 assert.equal(formatSignedBudgetMoney(-0.15,false,true),'-0,15 ₽');
 assert.equal(formatSignedBudgetMoney(-0.001,false,true),'0 ₽');
 assert.equal(formatSignedBudgetMoney(-123.45,true,true),'•••');
});
test('daily usage shows actual percent while progress is capped',()=>{
 const state=overviewLimitState(125.25,100);
 assert.equal(state.percentage,125.25);
 assert.equal(state.barWidth,100);
 assert.equal(state.difference,25.25);
});
