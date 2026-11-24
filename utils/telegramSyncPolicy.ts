export const TELEGRAM_POLL_MS=30_000;
export function telegramPollEnabled(ready:boolean,personal:boolean,chatId:string,configured:boolean):boolean{
 return ready&&!personal&&Boolean(chatId.trim())&&configured;
}
/** Same queue action always creates the same Firestore ID, including on another device. */
export function telegramQueueRecordId(queueId:string,kind:'shop'|'tx'|'event',index:number):string{
 if(!queueId||queueId.length>200||!Number.isInteger(index)||index<0||index>=100)throw new Error('Invalid Telegram action');
 return 'tgq_'+kind+'_'+encodeURIComponent(queueId).replace(/[!'()*~]/g,c=>'%'+c.charCodeAt(0).toString(16).toUpperCase())+'_'+index;
}
