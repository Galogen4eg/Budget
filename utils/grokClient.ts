import { Capacitor } from '@capacitor/core';
import { auth } from '../firebase';

export interface GrokKeyInfo {
  id: string;
  last4: string;
  state: 'ready' | 'invalid';
  checkedAt: number;
}
export interface GrokStatus {
  enabled: boolean;
  activeId: string | null;
  model: string;
  keys: GrokKeyInfo[];
}
export interface GrokMessage { role: 'system' | 'user' | 'assistant'; content: string; }
type SettingsAction =
  | {action:'status'}
  | {action:'add';key:string}
  | {action:'remove'|'recheck';id:string}
  | {action:'toggle';enabled:boolean};
export class GrokApiError extends Error {
  constructor(public readonly code:string,message:string){super(message);}
}
async function request<T>(uid:string,body:SettingsAction|{action:'query';messages:GrokMessage[]},signal?:AbortSignal):Promise<T>{
  const user=auth.currentUser;
  if(!user||user.uid!==uid)throw new GrokApiError('unauthenticated','Войдите в Budget');
  const token=await user.getIdToken();
  if(auth.currentUser?.uid!==uid)throw new GrokApiError('unauthenticated','Аккаунт изменился');
  const url=Capacitor.isNativePlatform()?'https://budget-omega-jade.vercel.app/api/grok':'/api/grok';
  let response:Response;
  try{
    response=await fetch(url,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},cache:'no-store',body:JSON.stringify(body),signal});
  }catch{throw new GrokApiError('unavailable','Не удалось связаться с сервером Grok');}
  let data:any;
  try{data=await response.json();}catch{throw new GrokApiError('unavailable','Сервер Grok недоступен');}
  if(!response.ok)throw new GrokApiError(typeof data?.code==='string'?data.code:'unavailable',typeof data?.error==='string'?data.error:'Не удалось выполнить запрос Grok');
  if(auth.currentUser?.uid!==uid)throw new GrokApiError('unauthenticated','Аккаунт изменился');
  return data as T;
}
export function updateGrokSettings(uid:string,body:SettingsAction,signal?:AbortSignal){
  return request<GrokStatus>(uid,body,signal);
}
export function generateGrok(uid:string,messages:GrokMessage[],signal?:AbortSignal){
  return request<{text:string;status:GrokStatus}>(uid,{action:'query',messages},signal);
}
