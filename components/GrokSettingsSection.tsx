import React,{useEffect,useRef,useState} from 'react';
import {useAuth} from '../contexts/AuthContext';
import {updateGrokSettings,type GrokStatus} from '../utils/grokClient';
import {TOOLBAR_ACTION,TOOLBAR_ACTION_IDLE,TOOLBAR_ACTION_PRIMARY} from './filterUiTokens';

const action=TOOLBAR_ACTION+' '+TOOLBAR_ACTION_IDLE;
const primary=TOOLBAR_ACTION+' '+TOOLBAR_ACTION_PRIMARY;
export default function GrokSettingsSection(){
 const {user,isOfflineMode}=useAuth();
 const uid=user?.uid;
 const [status,setStatus]=useState<GrokStatus|null>(null);
 const [key,setKey]=useState('');
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState('');
 const [error,setError]=useState('');
 const pending=useRef(false);
 const scope=useRef<AbortController|null>(null);
 useEffect(()=>{
  const controller=new AbortController();scope.current=controller;
  setStatus(null);setKey('');setError('');setMessage('');pending.current=false;
  if(!uid||isOfflineMode){setBusy(false);return ()=>controller.abort();}
  pending.current=true;setBusy(true);
  updateGrokSettings(uid,{action:'status'},controller.signal).then(result=>{
   if(!controller.signal.aborted)setStatus(result);
  }).catch(e=>{if(!controller.signal.aborted)setError(e instanceof Error?e.message:'Не удалось загрузить настройки Grok');})
  .finally(()=>{if(!controller.signal.aborted){pending.current=false;setBusy(false);}});
  return ()=>controller.abort();
 },[uid,isOfflineMode]);
 async function perform(body:Parameters<typeof updateGrokSettings>[1],success:string){
  const controller=scope.current;
  if(!uid||isOfflineMode||pending.current||!controller||controller.signal.aborted)return;
  pending.current=true;setBusy(true);setError('');setMessage('');
  try{
   const next=await updateGrokSettings(uid,body,controller.signal);
   if(controller.signal.aborted)return;
   setStatus(next);setMessage(success);
   if(body.action==='add')setKey('');
  }catch(e){
   if(controller.signal.aborted)return;
   setError(e instanceof Error?e.message:'Ошибка связи с Grok');
   // Recheck may have invalidated a key; an uncertain save may also have succeeded.
   try{const next=await updateGrokSettings(uid,{action:'status'},controller.signal);if(!controller.signal.aborted)setStatus(next);}
   catch{if(!controller.signal.aborted)setStatus(null);}
  }finally{if(!controller.signal.aborted){pending.current=false;setBusy(false);}}
 }
 const unavailable=!uid||isOfflineMode;
 return <section className="terra-settings-group" data-testid="grok-settings">
  <div className="flex flex-wrap items-center justify-between gap-2">
   <h3 className="text-base font-semibold text-[var(--terra-ink)]">Grok (xAI)</h3>
   <a className="inline-flex min-h-[44px] items-center text-sm font-semibold text-[var(--terra-primary-text)] hover:underline focus-visible:ring-2 focus-visible:ring-[var(--terra-focus)] rounded-lg" href="https://console.x.ai/" target="_blank" rel="noopener noreferrer">Получить API-ключ</a>
  </div>
  <p className="text-sm text-[var(--terra-muted)]">Личные ключи. Для ассистента используется один проверенный ключ; остальные служат резервными при отзыве доступа.</p>
  <p className="text-sm text-[var(--terra-muted)]">При включении Grok текст диалога, категории, финансовая сводка и до 15 операций выбранного режима могут отправляться в xAI. В режиме приватности сводка и операции не передаются. Проверка и запросы могут расходовать платную квоту.</p>
  <div role="status" data-testid="grok-config-status" className="text-sm text-[var(--terra-ink)]">
   {unavailable?'Войдите в аккаунт для настройки Grok':busy&&!status?'Загрузка…':status?(status.enabled?(status.activeId?'Grok подключён · '+status.model:'Нет рабочего ключа'):'Grok отключён'):'Настройки не подтверждены'}
  </div>
  {!unavailable&&status&&<>
   <div className="flex flex-wrap items-center justify-between gap-2">
    <span className="text-sm text-[var(--terra-muted)]">Ключи: {status.keys.length} из 3</span>
    <button type="button" className={action} aria-pressed={status.enabled} disabled={busy||(!status.enabled&&!status.activeId)} onClick={()=>void perform({action:'toggle',enabled:!status.enabled},status.enabled?'Grok отключён':'Grok включён')}>{status.enabled?'Отключить Grok':'Включить Grok'}</button>
   </div>
   {!!status.keys.length&&<ul className="divide-y divide-[var(--terra-border)] border-y border-[var(--terra-border)]">
    {status.keys.map(item=><li key={item.id} className="py-2 flex flex-wrap items-center justify-between gap-2" data-testid="grok-key-row">
     <div className="min-w-0 flex-1">
      <p className="text-sm font-semibold tabular-nums text-[var(--terra-ink)]">•••• {item.last4}</p>
      <p className={'text-xs '+(item.state==='invalid'?'text-[var(--terra-danger-text)]':'text-[var(--terra-muted)]')}>{item.state==='invalid'?'Нет доступа':item.id===status.activeId&&status.enabled?'Рабочий ключ':'Проверен · резервный'}</p>
      <p className="text-xs text-[var(--terra-muted)]">{new Date(item.checkedAt).toLocaleString('ru-RU')}</p>
     </div>
     <div className="flex flex-wrap gap-1">
      <button type="button" className={action} disabled={busy} aria-label={'Проверить ключ '+item.last4} onClick={()=>void perform({action:'recheck',id:item.id},'Ключ проверен')}>Проверить</button>
      <button type="button" className={TOOLBAR_ACTION+' text-[var(--terra-danger-text)] hover:bg-[var(--terra-danger-soft)]'} disabled={busy} aria-label={'Удалить ключ '+item.last4} onClick={()=>void perform({action:'remove',id:item.id},'Ключ удалён')}>Удалить</button>
     </div>
    </li>)}
   </ul>}
   {status.keys.length<3&&<form className="flex flex-col gap-2" onSubmit={e=>{e.preventDefault();if(key.trim())void perform({action:'add',key:key.trim()},'Ключ проверен и подключён');}}>
    <label htmlFor="grok-api-key" className="text-sm font-semibold text-[var(--terra-ink)]">API-ключ Grok</label>
    <input id="grok-api-key" type="password" value={key} onChange={e=>setKey(e.target.value)} autoComplete="new-password" spellCheck={false} autoCapitalize="none" maxLength={512} disabled={busy} className="min-h-[44px] min-w-0 w-full rounded-xl border border-[var(--terra-control-border)] bg-[var(--terra-surface)] px-3 text-base text-[var(--terra-ink)] focus-visible:ring-2 focus-visible:ring-[var(--terra-focus)]" placeholder="Вставьте ключ xAI" />
    <button type="submit" className={primary+' self-start terra-press'} disabled={busy||key.trim().length<12}>{busy?'Проверка…':'Проверить и подключить'}</button>
   </form>}
  </>}
  {!unavailable&&!status&&!busy&&<button type="button" className={action+' self-start'} onClick={()=>void perform({action:'status'},'Настройки загружены')}>Повторить загрузку</button>}
  {message&&<p role="status" className="text-sm text-[var(--terra-primary-text)]">{message}</p>}
  {error&&<p role="alert" className="text-sm text-[var(--terra-danger-text)]">{error}</p>}
 </section>;
}
