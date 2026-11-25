export type FinancialCollection = 'transactions' | 'goals' | 'debts';
export type FinancialReadStatus = 'loading' | 'ready' | 'stale' | 'error';
export type FinancialReadState = { scope: string | null; collections: Record<FinancialCollection, FinancialReadStatus> };
export function initialFinancialRead(scope: string | null): FinancialReadState {
 return {scope,collections:{transactions:'loading',goals:'loading',debts:'loading'}};
}
export function updateFinancialRead(state: FinancialReadState, scope: string, collection: FinancialCollection, status: FinancialReadStatus): FinancialReadState {
 if(state.scope!==scope||state.collections[collection]===status)return state;
 return {...state,collections:{...state.collections,[collection]:status}};
}
export function financialReadStatus(state: FinancialReadState, scope: string | null, settingsReady: boolean): FinancialReadStatus {
 if(scope===null)return 'ready';
 if(state.scope!==scope)return 'loading';
 const statuses=Object.values(state.collections);
 if(statuses.includes('error'))return 'error';
 if(statuses.includes('stale'))return 'stale';
 return settingsReady&&statuses.every(s=>s==='ready')?'ready':'loading';
}
