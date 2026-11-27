import type {AIAssistantOutput} from './aiAssistant';
import type {Category} from '../types';
const bad=()=>new Error('Grok не вернул корректное действие. Данные не изменены.');
function text(v:unknown,max:number,optional=false):string{
 if(optional&&(v===undefined||v===null||v===''))return '';
 if(typeof v!=='string'||!v.trim()||v.length>max)throw bad();
 return v.trim();
}
function date(v:unknown):string{
 const d=text(v,10);
 if(!/^\d{4}-\d{2}-\d{2}$/.test(d))throw bad();
 const t=new Date(d+'T00:00:00Z');
 if(!Number.isFinite(t.getTime())||t.toISOString().slice(0,10)!==d)throw bad();
 return d;
}
export function decodeGrokAction(raw:string,categories:Pick<Category,'id'|'transactionType'>[]):AIAssistantOutput{
 let v:any;
 try{v=JSON.parse(raw);}catch{throw bad();}
 if(!v||typeof v!=='object'||Array.isArray(v))throw bad();
 const replyText=text(v.reply,5000);
 if(v.action==='general_chat'||v.action==='analyze_expenses')return {actionType:v.action,replyText};
 if(v.action==='create_rule')return {actionType:'general_chat',replyText:'Правило пока не сохранено. Добавьте его в настройках категорий.'};
 if(v.action==='add_transaction'){
  const p=v.transaction;
  if(!p||!['income','expense'].includes(p.type)||typeof p.amount!=='number'||!Number.isFinite(p.amount)||p.amount<=0)throw bad();
  const cents=Math.round(p.amount*100);
  if(!Number.isSafeInteger(cents)||Math.abs(p.amount*100-cents)>0.000001)throw bad();
  const category=categories.find(c=>c.id===p.categoryId);
  if(!category||(category.transactionType&&category.transactionType!==p.type))throw bad();
  return {actionType:'add_transaction',replyText,transactionPayload:{amount:cents/100,type:p.type,categoryId:category.id,note:text(p.note,500,true),date:date(p.date)}};
 }
 if(v.action==='add_shopping'){
  if(!Array.isArray(v.shoppingItems)||v.shoppingItems.length===0||v.shoppingItems.length>30)throw bad();
  const items=v.shoppingItems.map((item:any)=>{
   if(!item||!['шт','кг','уп','л'].includes(item.unit))throw bad();
   return {title:text(item.title,200),amount:text(item.amount,30,true)||'1',unit:item.unit as 'шт'|'кг'|'уп'|'л'};
  });
  return {actionType:'add_shopping',replyText,shoppingPayload:{items}};
 }
 if(v.action==='create_event'){
  const p=v.event;
  if(!p||typeof p.time!=='string'||!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(p.time))throw bad();
  return {actionType:'create_event',replyText,eventPayload:{title:text(p.title,200),date:date(p.date),time:p.time,description:text(p.description,1000,true)}};
 }
 throw bad();
}
