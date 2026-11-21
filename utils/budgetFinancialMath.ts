/**
 * Monetary values are displayed in rubles but added in integer kopecks.
 * Existing Firestore transaction amounts and IDs are never rewritten.
 */
export function cents(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Math.sign(value) * Number.EPSILON) * 100);
}

export function money(kopecks: number): number {
  return Math.round(kopecks) / 100;
}

export function sumMoney(values: readonly number[]): number {
  return money(values.reduce((sum, value) => sum + cents(value), 0));
}

export function monthlyMoneyTotals(
  transactions: readonly {type: string; amount: number}[]
): {income:number;expense:number;net:number} {
  let income = 0;
  let expense = 0;
  for (const tx of transactions) {
    if (tx.type === 'income') income += cents(tx.amount);
    if (tx.type === 'expense') expense += cents(tx.amount);
  }
  return {income:money(income),expense:money(expense),net:money(income-expense)};
}

/** Never allocate more than the available money; includes carried balance. */
export function budgetDailyLimit(totalBalance: number, reservedAmount: number, days: number): number {
  const available = Math.max(0, cents(totalBalance) - Math.max(0,cents(reservedAmount)));
  if (!Number.isFinite(days) || days <= 0) return 0;
  return money(Math.floor(available / Math.ceil(days)));
}

export interface BudgetBill {
  id: string;
  name: string;
  amount: number;
  keywords?: string[];
  linkedDebtId?: string;
}

export interface BudgetPayment {
  id: string;
  amount: number;
  type: string;
  note?: string;
  rawNote?: string;
  linkedExpenseId?: string;
  linkedDebtId?: string;
}

export interface MandatoryPaymentState {
  id: string;
  paidAmount: number;
  isPaid: boolean;
  isManuallyPaid: boolean;
  amountNeeded: number;
}

const normalized = (value: string | undefined) => (value || '').toLocaleLowerCase('ru-RU');

function keywordMatches(tx: BudgetPayment, bill: BudgetBill): boolean {
  const text = `${normalized(tx.note)} ${normalized(tx.rawNote)}`;
  const phrases = [bill.name, ...(bill.keywords || [])]
    .map(v=>normalized(v).trim()).filter(v=>v.length >= 3);
  return phrases.some(phrase=>text.includes(phrase));
}

/**
 * An operation may satisfy ONE obligation only. Explicit links take priority;
 * ambiguous fuzzy matches remain unassigned for manual review.
 */
export function mandatoryPaymentStates(
  bills: readonly BudgetBill[],
  transactions: readonly BudgetPayment[],
  manuallyPaidIds: readonly string[]
): MandatoryPaymentState[] {
  const paid = new Map(bills.map(b=>[b.id,0]));
  for (const tx of transactions) {
    if (tx.type !== 'expense') continue;
    let target: BudgetBill|undefined;
    if (tx.linkedExpenseId || tx.linkedDebtId) {
      target = bills.find(b=>b.id===tx.linkedExpenseId);
      if (!target && tx.linkedDebtId) {
        const linked = bills.filter(b=>b.linkedDebtId===tx.linkedDebtId);
        if (linked.length===1) target=linked[0];
      }
    } else {
      const eligible=bills.filter(b=>keywordMatches(tx,b));
      if (eligible.length===1) target=eligible[0];
    }
    if(target)paid.set(target.id,(paid.get(target.id)||0)+Math.max(0,cents(tx.amount)));
  }
  const manuallyPaid = new Set(manuallyPaidIds);
  return bills.map(bill=>{
    const amount=Math.max(0,cents(bill.amount));
    const credited=paid.get(bill.id)||0;
    const isManuallyPaid=manuallyPaid.has(bill.id);
    const isPaid=isManuallyPaid || (amount>0 && credited>=Math.ceil(amount*0.95));
    return {
      id:bill.id, paidAmount:money(credited), isPaid, isManuallyPaid,
      amountNeeded:isPaid?0:money(Math.max(0,amount-credited))
    };
  });
}
