import {sumMoney} from './budgetFinancialMath';
export type ReserveItem={expense:{id:string;amount:number};amountNeeded:number;isPaid:boolean};
export function reserveSelection(items:readonly ReserveItem[],selected:ReadonlySet<string>){
 const payable=items.filter(item=>!item.isPaid&&selected.has(item.expense.id));
 return {ids:payable.map(item=>item.expense.id),total:sumMoney(payable.map(item=>item.amountNeeded>0?item.amountNeeded:item.expense.amount))};
}
