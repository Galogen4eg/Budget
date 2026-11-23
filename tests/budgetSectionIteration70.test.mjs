import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {calculateFamilyBudgetProjection} from '../utils/familyBudgetProjection.ts';
import {mandatoryPaymentStates} from '../utils/budgetFinancialMath.ts';
import {filterBudgetHistory} from '../utils/budgetHistory.ts';

const read = path => readFileSync(new URL(path,import.meta.url),'utf8');

test('iteration 70: mandatory reserve is not member-filtered, including partial payments',()=>{
  const all=[
    {id:'p1',type:'income',amount:1500,memberId:'a',category:'salary',date:'2026-11-20',note:''},
    {id:'p2',type:'income',amount:2000,memberId:'b',category:'salary',date:'2026-11-20',note:''},
    {id:'p3',type:'expense',amount:50.15,memberId:'b',category:'housing',date:'2026-11-20',linkedExpenseId:'rent',note:''}
  ];
  const projection=calculateFamilyBudgetProjection({
    transactions:all,monthTransactions:all,
    bills:[{id:'rent',name:'Аренда',amount:100.2,day:18,remind:false}],
    categories:[{id:'salary',label:'Зарплата'}],
    manuallyPaidIds:[],initialBalance:1000,savingsRate:0,
    manualReservedAmount:0,goalSavedAmounts:[],enableSmartReserve:true
  });
  const onlyA=filterBudgetHistory(all.filter(t=>t.memberId==='a'),'all','',[],[]);
  assert.equal(onlyA.length,1);
  assert.equal(projection.mandatoryReserve,50.05);
  assert.equal(projection.ledger,4449.85);
  assert.equal(projection.availableBalance,4399.8);
});

test('iteration 70: category ledger and date scope remain independent of history search',()=>{
  const src=read('../components/TerraBudget.tsx');
  assert.ok(src.includes('monthTransactions: familyMonthTransactions'));
  assert.ok(src.includes('filterBudgetHistory('));
  assert.ok(src.includes("historyScope === 'day' ? selectedDayTransactions : monthTransactions"));
  assert.ok(src.includes('buildBudgetDayMoney(monthTransactions,currentMonth)'));
});

test('iteration 70: manual bill acknowledgment does not fabricate a transaction',()=>{
  const states=mandatoryPaymentStates([{id:'rent',name:'Аренда',amount:100,day:10}],[],['rent']);
  assert.equal(states[0].isPaid,true);
  assert.equal(states[0].paidAmount,0);
  assert.equal(states[0].amountNeeded,0);
});

test('iteration 70: quick add permits explicit payer without filtering family history',()=>{
  const src=read('../components/TerraBudget.tsx');
  assert.ok(src.includes('const [quickMemberId, setQuickMemberId]'));
  assert.ok(src.includes('id="budget-quick-member"'));
  assert.ok(src.includes('Кто совершил покупку?'));
  assert.ok(src.includes("selectedMember !== 'all' ? selectedMember : (quickMemberId || ownMember?.id)"));
  assert.ok(src.includes('onChange={event=>{setQuickMemberId(event.target.value);setQuickAddError'));
  assert.ok(!src.includes("members[0]?.id || '1'"));
});

test('iteration 70: desktop day operations and month history have keyboard accessible actions',()=>{
  const src=read('../components/TerraBudget.tsx');
  const labels=src.match(/aria-label=\{.?Редактировать операцию:/g)||[];
  assert.ok(labels.length>=3,'day card, desktop history and mobile day cards should each be accessible');
  assert.ok(src.includes('min-h-[48px] w-full text-left flex items-center justify-between'));
  assert.ok(src.includes('aria-label="Поиск по истории операций"'));
});

test('iteration 70: privacy mode hides the two mobile calendar money badges',()=>{
  const src=read('../components/TerraBudget.tsx');
  const badges=src.match(/\{settings\.privacyMode \? '•••' : badgeText\}/g)||[];
  assert.equal(badges.length,2);
  assert.ok(src.includes('settings.privacyMode ? undefined :'));
});

test('iteration 70: guarded full import and duplicates are retained',()=>{
  const modal=read('../components/ImportModal.tsx');
  const app=read('../App.tsx');
  const duplicates=read('../components/DuplicatesModal.tsx');
  assert.ok(modal.includes('splitImportReview(selected, categories).needsReview.length'));
  assert.ok(app.includes('assertImportBatchReady(itemsToImport, categories, importMemberId)'));
  assert.ok(duplicates.includes('Снять выбор'));
});

test('iteration 70: quick add writes the selected expense category to the ledger',()=>{
  const budget=read('../components/TerraBudget.tsx');
  const app=read('../App.tsx');
  assert.ok(budget.includes('id="budget-quick-category"'));
  assert.ok(budget.includes("quickCategoryId, onQuickAddTransaction"));
  assert.ok(app.includes('category: categoryId,'));
  assert.ok(app.includes("categoryId !== 'other'"));
});
