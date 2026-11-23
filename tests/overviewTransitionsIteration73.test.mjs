import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const src=readFileSync(new URL('../components/TerraOverview.tsx',import.meta.url),'utf8');
const recent=readFileSync(new URL('../components/overview/OverviewRecentTransactions.tsx',import.meta.url),'utf8');

test('iteration 73: mobile recent transactions use sorted canonical recent list',()=>{
 assert.match(src,/const recentMobileTransactions = recentTransactions\.slice\(0, 4\)/);
 assert.doesNotMatch(src,/const recentMobileTransactions = filteredTransactions\.slice\(0, 4\)/);
});

test('iteration 73: month chart navigates to month, not fictional first-day detail',()=>{
 assert.match(src,/if \(chartScale === 'month'\) \{/);
 assert.match(src,/handleMonthChange\(new Date\(payloadData\.dateObj\)\)/);
 assert.match(src,/setSelectedDayDetailDate\(new Date\(payloadData\.dateObj\)\)/);
});

test('iteration 73: hidden currency stays hidden in mobile graph and description',()=>{
 assert.match(src,/settings\.privacyMode \? '•••' : formatBudgetMoney/);
 assert.match(src,/settings\.privacyMode \? 'График расходов: суммы скрыты'/);
 assert.doesNotMatch(src,/typeof val === 'number' \? Math\.round\(val\)\.toLocaleString/);
});

test('iteration 73: desktop and mobile operation rows are buttons',()=>{
 const labels=src.match(/aria-label=\{\x60Редактировать операцию:/g)||[];
 assert.ok(labels.length>=2,'two labelled operation rows');
 assert.match(src,/min-h-\[48px\]/);
});

test('iteration 73: reusable recent history component navigates to existing Budget tab',()=>{
 assert.match(recent,/onNavigateTab\('budget'\)/);
 assert.doesNotMatch(recent,/onNavigateTab\('transactions'\)/);
 assert.match(recent,/aria-label=\{\x60Редактировать операцию:/);
});

test('iteration 73: chart period controls and category details remain accessible',()=>{
 assert.match(src,/aria-pressed=\{chartScale === scale\}/);
 assert.match(src,/aria-label=\{\x60Аналитика категории:/);
});
