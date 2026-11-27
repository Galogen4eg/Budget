import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {filterBudgetHistory} from '../utils/budgetHistory.ts';

const categories=[{id:'food',label:'Продукты'},{id:'salary',label:'Зарплата'}];
const members=[{id:'a',name:'Папа'},{id:'b',name:'Мама'}];
const transactions=[
 {id:'third',date:'2026-11-21T08:00:00Z',type:'expense',amount:20.15,note:'Аптека',rawNote:'',memberId:'b',category:'food'},
 {id:'second',date:'2026-11-22T12:00:00Z',type:'income',amount:500,note:'Работа',rawNote:'',memberId:'b',category:'salary'},
 {id:'first',date:'2026-11-22T12:00:00Z',type:'expense',amount:12.35,note:'Магнит',rawNote:'Магнит',memberId:'a',category:'food'}
];

test('iteration 68: expense history filters without changing ledger or source array',()=>{
 const before=transactions.map(tx=>tx.id);
 const result=filterBudgetHistory(transactions,'expense','',categories,members);
 assert.deepEqual(result.map(tx=>tx.id),['first','third']);
 assert.deepEqual(transactions.map(tx=>tx.id),before);
});
test('iteration 68: search includes member, category, raw description and normalizes case',()=>{
 assert.deepEqual(filterBudgetHistory(transactions,'all','мама',categories,members).map(tx=>tx.id),['second','third']);
 assert.deepEqual(filterBudgetHistory(transactions,'all','ПРОДУКТЫ',categories,members).map(tx=>tx.id),['first','third']);
 assert.deepEqual(filterBudgetHistory(transactions,'all','МАГНИТ',categories,members).map(tx=>tx.id),['first']);
});
test('iteration 68: equal-date operations have deterministic IDs and empty results are honest',()=>{
 assert.deepEqual(filterBudgetHistory(transactions,'all','',categories,members).map(tx=>tx.id),['first','second','third']);
 assert.deepEqual(filterBudgetHistory(transactions,'income','аптека',categories,members),[]);
});
test('iteration 68: desktop history never silently shows monthly rows for an empty day',()=>{
 const src=readFileSync(new URL('../components/TerraBudget.tsx',import.meta.url),'utf8');
 assert.doesNotMatch(src,/selectedDayTransactions\.length > 0 \? selectedDayTransactions : monthTransactions\.slice\(0, 6\)/);
 assert.match(src,/historyScope === 'day' \? selectedDayTransactions : monthTransactions/);
 const controls=readFileSync(new URL('../components/BudgetHistoryControls.tsx',import.meta.url),'utf8');
 assert.equal((src.match(/<BudgetHistoryControls\b/g)||[]).length,2);
 assert.match(controls,/aria-label="Поиск по истории операций"/);
 assert.match(controls,/aria-label="Период истории операций"/);
 assert.match(controls,/aria-pressed=\{historyScope===scope\}/);
 assert.match(src,/aria-label=\{\x60Редактировать операцию:/);
});
test('iteration 68: quick add never assigns money to arbitrary first family member',()=>{
 const src=readFileSync(new URL('../components/TerraBudget.tsx',import.meta.url),'utf8');
 assert.doesNotMatch(src,/members\[0\]\?\.id \|\| '1'/);
 assert.match(src,/member\.userId === user\?\.uid/);
 assert.match(src,/Выберите участника бюджета для этой операции/);
 assert.match(src,/inputMode="decimal"/);
});
test('iteration 68: transaction editor rejects malformed numeric text and rounds expressions to kopecks',()=>{
 const src=readFileSync(new URL('../components/AddTransactionModal.tsx',import.meta.url),'utf8');
 assert.doesNotMatch(src,/parseFloat\(amount\.replace/);
 assert.match(src,/Number\(normalizedAmount\)/);
 assert.match(src,/Number\.isFinite\(finalAmount\)/);
 assert.match(src,/finalAmount=Math\.round\(finalAmount\*100\)\/100/);
});

test('iteration 68: mobile day operations have labeled keyboard-accessible controls',()=>{
 const source=readFileSync(new URL('../components/TerraBudget.tsx',import.meta.url),'utf8');
 assert.match(source,/aria-label=\{\x60Редактировать операцию: \$\{displayTitle\}\x60\}/);
 const section=source.split('data-testid="budget-history-mobile"')[1]?.split('</section>')[0];
 assert.ok(section);
 const row=section.match(/<button type="button"\s+key=\{tx\.id[^\n]*[\s\S]*?aria-label=\{\x60Редактировать операцию:[^\n]*\n\s*className="([^"]+)"/)?.[1];
 assert.ok(row,'mobile transaction button must retain accessible label');
 for(const token of ['min-h-[48px]','w-full','text-left','focus-visible:ring-2'])assert.ok(row.split(/\s+/).includes(token),token);
});
