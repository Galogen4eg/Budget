import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {estimateDebtPayoff} from '../utils/debtPayoffEstimate.ts';
test('principal-only payoff estimate uses saved balances and exact kopecks, never an invented saving',()=>{
 assert.deepEqual(estimateDebtPayoff(100000,10000,5000),{baselineMonths:10,withExtraMonths:7});
 assert.deepEqual(estimateDebtPayoff(.3,.1,.1),{baselineMonths:3,withExtraMonths:2});
 assert.deepEqual(estimateDebtPayoff(0,0,0),{baselineMonths:0,withExtraMonths:0});
 assert.deepEqual(estimateDebtPayoff(100,10,0),{baselineMonths:10,withExtraMonths:10});
 for(const args of [[100,0,0],[100,10,-1],[Infinity,10,1],[100,NaN,1]])assert.equal(estimateDebtPayoff(...args),null);
});
test('debt presentation does not report fabricated trends, interest savings or automatic debits',()=>{
 const source=readFileSync(new URL('../components/DebtSnowball.tsx',import.meta.url),'utf8');
 for(const fake of ['+1.2% в этом мес.','Безопасно (24%)','Экономия ~248 000','~18 400','Автосписание настроено','terraGradFlow','0% переплаты','3 взноса','Оплачен вовремя','Без просрочек','Срок первого кредита сократится на 4 месяца','extraPaymentAmount * 3.6'])assert.ok(!source.includes(fake),fake);
 assert.match(source,/estimateDebtPayoff\(/);
 assert.match(source,/без новых процентов и комиссий/);
 assert.match(source,/computeDebtMonthPaymentStatus/);
});
test('services expose one back action in every loading or ready subpage',()=>{
 const source=readFileSync(new URL('../components/ServicesHub.tsx',import.meta.url),'utf8');
 assert.equal((source.match(/<span>Все сервисы<\/span>/g)||[]).length,1);
 assert.match(source,/activeService !== 'debts' \|\| financialDataStatus!=='ready'/);
 assert.match(source,/returnService/);
});
