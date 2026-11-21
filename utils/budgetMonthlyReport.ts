import { cents, money, monthlyMoneyTotals, sumMoney } from './budgetFinancialMath.ts';
import { buildCategoryBudgetRows, normalizeCategoryBudget } from './budgetPlanning.ts';

type BudgetCategory = {id:string;label:string;parentId?:string};
type BudgetTransaction = {
  id:string;date:string;type:string;category:string;amount:number;
};
export interface MonthlyBudgetReport {
  month:string;
  income:number;expense:number;net:number;
  planned:number;plannedSpent:number;plannedRemaining:number;
  overBudget:number;unplannedSpent:number;
  previousMonthExpense:number;expenseChange:number;expenseChangePercent:number|null;
  overlappingLimitIds:string[];
}

/**
 * Actual is the complete ledger expense total for the selected calendar month.
 * Plan / actual is limited to non-overlapping category limits only. Child
 * limits nested under a limited parent are reported separately in the UI,
 * but excluded from plan totals to avoid double counting any purchase.
 */
export function buildMonthlyBudgetReport(
  transactions:readonly BudgetTransaction[],
  categories:readonly BudgetCategory[],
  limits:Readonly<Record<string,number>>,
  selectedMonth:Date
):MonthlyBudgetReport {
  const year=selectedMonth.getFullYear(),index=selectedMonth.getMonth();
  const month=`${year}-${String(index+1).padStart(2,'0')}`;
  const prevDate=new Date(year,index-1,1);
  const previousMonth=`${prevDate.getFullYear()}-${String(prevDate.getMonth()+1).padStart(2,'0')}`;
  const selected=transactions.filter(tx=>tx.date.slice(0,7)===month);
  const prior=transactions.filter(tx=>tx.date.slice(0,7)===previousMonth);
  const {income,expense,net}=monthlyMoneyTotals(selected);
  const previousMonthExpense=monthlyMoneyTotals(prior).expense;
  const rows=buildCategoryBudgetRows(selected,categories,limits);
  const validBudgetIds=new Set(rows.map(row=>row.categoryId));
  const byId=new Map(categories.map(category=>[category.id,category]));
  const overlappingLimitIds:string[]=[];
  const topLevelRows=rows.filter(row=>{
    const seen=new Set<string>([row.categoryId]);
    let ancestor=byId.get(row.categoryId)?.parentId;
    while(ancestor&&!seen.has(ancestor)){
      if(validBudgetIds.has(ancestor)){
        overlappingLimitIds.push(row.categoryId);
        return false;
      }
      seen.add(ancestor);
      ancestor=byId.get(ancestor)?.parentId;
    }
    return true;
  });
  const planned=sumMoney(topLevelRows.map(row=>row.limit));
  const plannedSpent=sumMoney(topLevelRows.map(row=>row.spent));
  const plannedRemaining=sumMoney(topLevelRows.map(row=>row.remaining));
  const overBudget=sumMoney(topLevelRows.map(row=>Math.max(0,money(cents(row.spent)-cents(row.limit)))));
  const unplannedSpent=money(Math.max(0,cents(expense)-cents(plannedSpent)));
  const expenseChange=money(cents(expense)-cents(previousMonthExpense));
  const expenseChangePercent=previousMonthExpense>0?
    Math.round((expenseChange/previousMonthExpense)*10000)/100:null;
  return {
    month,income,expense,net,planned,plannedSpent,plannedRemaining,
    overBudget,unplannedSpent,previousMonthExpense,expenseChange,expenseChangePercent,
    overlappingLimitIds
  };
}
