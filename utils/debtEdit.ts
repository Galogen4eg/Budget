import type { Debt, MandatoryExpense } from '../types';

/** Parse the whole value, never accept a valid numeric prefix or silently round fractions. */
export function parseDebtAmount(raw: string): number {
  const value=raw.trim();
  if(!/^(?:\d+|\d{1,3}(?:[ \u00a0\u202f]\d{3})+)(?:[.,]\d{1,2})?$/.test(value))throw new Error('Введите корректную сумму (до двух знаков после запятой).');
  const [whole,fraction='']=value.replace(/[ \u00a0\u202f]/g,'').split(/[.,]/);
  const kopecks=BigInt(whole)*100n+BigInt(fraction.padEnd(2,'0'));
  if(kopecks>BigInt(Number.MAX_SAFE_INTEGER))throw new Error('Сумма превышает допустимый диапазон.');
  const integer=Number(kopecks), amount=integer/100;
  if(Math.round(amount*100)!==integer)throw new Error('Сумма не может быть сохранена с точностью до копейки.');
  return amount;
}
export function parseDebtAmounts(total:string,paid:string,monthly:string){
  const totalAmount=parseDebtAmount(total), paidAmount=parseDebtAmount(paid),monthlyPayment=parseDebtAmount(monthly);
  const balance=Math.round(totalAmount*100)-Math.round(paidAmount*100);
  if(balance<0)throw new Error('Выплачено больше общей суммы долга.');
  return {totalAmount,currentBalance:balance/100,monthlyPayment};
}
/** Derive reciprocal links from the latest saved obligations, not a stale form snapshot. */
export function planDebtExpenseLink(expenses:readonly MandatoryExpense[],debt:Pick<Debt,'id'|'name'|'monthlyPayment'|'dueDate'|'linkedExpenseId'>):MandatoryExpense[]{
  const selected=debt.linkedExpenseId||null;
  if(selected){
    const target=expenses.find(e=>e.id===selected);
    if(!target)throw new Error('Связанный обязательный платёж не найден.');
    if(target.linkedDebtId&&target.linkedDebtId!==debt.id)throw new Error('Платёж уже связан с другим долгом.');
    if(!Number.isFinite(debt.monthlyPayment)||!(Number(debt.monthlyPayment)>0))throw new Error('Для связанного платежа укажите положительный месячный взнос.');
  }
  return expenses.map(expense=>{
    if(expense.id===selected){
      const day=Number(debt.dueDate?.match(/^\d{4}-\d{2}-(\d{2})$/)?.[1]);
      return {...expense,name:debt.name,title:debt.name,amount:debt.monthlyPayment!,day:day>=1&&day<=31?day:expense.day,expenseType:'debt',linkedDebtId:debt.id};
    }
    return expense.linkedDebtId===debt.id?{...expense,linkedDebtId:null}:expense;
  });
}
