import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import type { ShoppingItem, Transaction, FamilyEvent, AppSettings } from '../types';
import { addTelegramItemsIdempotent } from '../utils/db';
import { detectProductCategory } from '../utils/categorizer';
import { telegramPollEnabled, telegramQueueRecordId, TELEGRAM_POLL_MS } from '../utils/telegramSyncPolicy';

interface UseTelegramSyncParams {
  readonly settings: AppSettings;
  readonly familyId: string | null;
  readonly householdPersonal: boolean;
  readonly settingsReady: boolean;
  readonly setShoppingItems: React.Dispatch<React.SetStateAction<ShoppingItem[]>>;
  readonly setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  readonly setEvents: React.Dispatch<React.SetStateAction<FamilyEvent[]>>;
}

export function useTelegramSync({settings,familyId,householdPersonal,settingsReady}:UseTelegramSyncParams){
 const isSyncingRef=useRef(false);
 const chatId=settings.telegramChatId?.trim()||'';
 const configured=Boolean(settings.telegramBotToken?.trim());
 useEffect(()=>{
  if(!familyId||!telegramPollEnabled(settingsReady,householdPersonal,chatId,configured))return;
  let cancelled=false;
  const processed=new Set<string>();
  const syncPendingActions=async()=>{
   if(cancelled||document.hidden||!navigator.onLine||isSyncingRef.current)return;
   isSyncingRef.current=true;
   try{
    const res=await fetch('/api/tg-sync?chatId='+encodeURIComponent(chatId),{cache:'no-store'});
    if(!res.ok||cancelled)return;
    const data=await res.json();
    if(!Array.isArray(data.queue))return;
    const ackIds:string[]=[];
    for(const item of data.queue){
     if(cancelled)break;
     if(typeof item?.id!=='string'||!item.id||item.id.length>200)continue;
     // Never consume unscoped queue entries or entries belonging to another chat.
     if(String(item.chatId??'')!==chatId)continue;
     if(processed.has(item.id)){ackIds.push(item.id);continue;}
     try{
      const payload=item.payload||{};
      let created=0;
      if(item.action==='add_shopping'){
       const rows=payload.items||payload.shoppingItems;
       if(!Array.isArray(rows)||!rows.length||rows.length>100)continue;
       if(rows.some(row=>!row||typeof row.title!=='string'||!row.title.trim()))continue;
       const products:ShoppingItem[]=rows.map((row,i)=>({
        id:telegramQueueRecordId(item.id,'shop',i),title:row.title.trim(),
        amount:row.amount?String(row.amount):undefined,unit:row.unit||'шт',
        completed:false,memberId:'telegram',priority:'medium',
        category:detectProductCategory(row.title)||'other'
       }));
       created=await addTelegramItemsIdempotent(familyId,'shopping',products);
      }else if(item.action==='add_transaction'){
       const t=payload.transaction,amount=Number(t?.amount);
       if(!t||!Number.isFinite(amount)||amount<=0||!['income','expense'].includes(t.type))continue;
       const tx:Transaction={id:telegramQueueRecordId(item.id,'tx',0),amount,type:t.type,
        category:t.categoryId||'other',note:t.note?'[TG] '+t.note:'[TG] Операция из Telegram',
        date:t.date||new Date().toISOString().split('T')[0],memberId:'telegram'};
       created=await addTelegramItemsIdempotent(familyId,'transactions',[tx]);
      }else if(item.action==='create_event'){
       const e=payload.event;
       if(!e||typeof e.title!=='string'||!e.title.trim())continue;
       const ev:FamilyEvent={id:telegramQueueRecordId(item.id,'event',0),title:e.title.trim(),
        description:e.description||'Создано через Telegram-бота',date:e.date||new Date().toISOString().split('T')[0],time:e.time||'12:00',memberIds:[]};
       created=await addTelegramItemsIdempotent(familyId,'events',[ev]);
      }else continue;
      // The Firestore listener owns UI state. ACK follows confirmed writes.
      processed.add(item.id);ackIds.push(item.id);
      if(created&&!cancelled)toast.success('Из Telegram: данные добавлены');
     }catch(error){console.warn('Telegram action not confirmed; retained for retry',error);break;}
    }
    if(!cancelled&&ackIds.length){
     const ack=await fetch('/api/tg-sync',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ackIds})});
     if(ack.ok)for(const id of ackIds)processed.delete(id);
    }
   }catch(error){console.debug('Telegram sync poll err:',error);}
   finally{isSyncingRef.current=false;}
  };
  void syncPendingActions();
  const timer=setInterval(syncPendingActions,TELEGRAM_POLL_MS);
  document.addEventListener('visibilitychange',syncPendingActions);
  window.addEventListener('online',syncPendingActions);
  return()=>{cancelled=true;clearInterval(timer);document.removeEventListener('visibilitychange',syncPendingActions);window.removeEventListener('online',syncPendingActions);};
 },[chatId,configured,familyId,householdPersonal,settingsReady]);
}
