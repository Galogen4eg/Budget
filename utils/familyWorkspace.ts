export function isOwnChatMessage(message:{userId:string},uid:string|undefined):boolean {
 return Boolean(uid&&message.userId===uid);
}
export function chatMessageTime(timestamp:number):string {
 if(!Number.isFinite(timestamp)||timestamp<=0)return '';
 const date=new Date(timestamp);
 if(!Number.isFinite(date.getTime()))return '';
 return date.toLocaleString('ru-RU',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});
}
export function shouldFollowChat(height:number,viewport:number,top:number):boolean {
 return height-viewport-top<=120;
}
export function unseenPurchaseCompletions<T extends {id:string;title:string;completed?:boolean;completedAt?:number|null}>(items:readonly T[],history:readonly {shoppingItemId:string;purchaseEventId?:string}[]):T[] {
 const known=new Set(history.map(p=>p.purchaseEventId||p.shoppingItemId));
 return items.filter(item=>item.completed&&item.id&&item.title?.trim()&&!known.has(item.completedAt?`${item.id}@${item.completedAt}`:item.id));
}
export function assertDebtDeletionSafe(debt:{id:string;linkedExpenseId?:string|null},bills:readonly {id:string;linkedDebtId?:string|null}[],transactions:readonly {linkedDebtId?:string|null;linkedExpenseId?:string|null}[]):void {
 if(bills.some(b=>b.linkedDebtId===debt.id||b.id===debt.linkedExpenseId)||transactions.some(t=>t.linkedDebtId===debt.id||(debt.linkedExpenseId&&t.linkedExpenseId===debt.linkedExpenseId)))throw new Error('Долг связан с платежами или операциями. Сначала проверьте и удалите связи.');
}

/** A closed search never filters the conversation, including a stale query. */
export function filterChatMessages<T extends {text?:string}>(messages:readonly T[],query:string,searchOpen:boolean):readonly T[]{
 const q=searchOpen?query.trim().toLocaleLowerCase('ru-RU'):'';
 return q?messages.filter(message=>(message.text||'').toLocaleLowerCase('ru-RU').includes(q)):messages;
}
