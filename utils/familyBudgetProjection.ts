import type { Transaction, MandatoryExpense } from '../types';
import { ledgerBalance, mandatoryPaymentStates, sumMoney } from './budgetFinancialMath.ts';

type CategoryName={id:string;label:string};

export interface FamilyProjectionInput {
  /** Full shared family ledger, never the selected-member history subset. */
  transactions:readonly Transaction[];
  /** Only the selected calendar month, still across all family members. */
  monthTransactions:readonly Transaction[];
  bills:readonly MandatoryExpense[];
  categories:readonly CategoryName[];
  manuallyPaidIds:readonly string[];
  initialBalance:number;
  initialBalanceDate?:string;
  enableSmartReserve?:boolean;
  savingsRate:number;
  manualReservedAmount?:number;
  goalSavedAmounts:readonly number[];
}

/**
 * One projection for the family, independent of the UI member filter.
 * A member filter may change visible transaction rows and their subtotal,
 * but must not invent a personal portion of shared opening funds or reserves.
 */
export function calculateFamilyBudgetProjection(input:FamilyProjectionInput){
  const monthStates=mandatoryPaymentStates(
    input.bills,input.monthTransactions,input.manuallyPaidIds
  );
  const mandatoryReserve=input.enableSmartReserve!==false
    ? sumMoney(monthStates.map(x=>x.amountNeeded)) : 0;
  const categoryLabels=new Map(input.categories.map(x=>[x.id,x.label.toLocaleLowerCase('ru-RU')]));
  const monthlySalary=sumMoney(input.monthTransactions.filter(tx=>{
    const label=categoryLabels.get(tx.category)||'';
    return tx.type==='income'
      && (tx.category==='salary'||label.includes('зарплата')||label.includes('salary'));
  }).map(tx=>tx.amount));
  const savingsReserve=sumMoney([monthlySalary*((input.savingsRate||0)/100)]);
  const manualReserve=typeof input.manualReservedAmount==='number'
    ? input.manualReservedAmount : sumMoney(input.goalSavedAmounts);
  const reservedAmount=sumMoney([mandatoryReserve,savingsReserve,manualReserve]);
  const ledger=ledgerBalance(input.transactions,input.initialBalance,input.initialBalanceDate);
  const availableBalance=Math.max(0,sumMoney([ledger,-reservedAmount]));

  return {monthlyPaymentStates:monthStates,monthlySalary,mandatoryReserve,
    savingsReserve,manualReserve,reservedAmount,ledger,availableBalance};
}
