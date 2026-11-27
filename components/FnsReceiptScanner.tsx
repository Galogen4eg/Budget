import React,{useState} from 'react';
import {parseReceiptQr,type ReceiptQr} from '../utils/receiptQr';
import {useData} from '../contexts/DataContext';
import {SURFACE_CARD,TOOLBAR_ACTION,TOOLBAR_ACTION_PRIMARY} from './filterUiTokens';

export interface FnsReceiptScannerProps {onClose?:()=>void}
export const FnsReceiptScanner:React.FC<FnsReceiptScannerProps>=()=>{
 const {settings}=useData();
 const [raw,setRaw]=useState(''),[result,setResult]=useState<ReceiptQr|null>(null),[error,setError]=useState('');
 const parse=(event:React.FormEvent)=>{event.preventDefault();setResult(null);setError('');try{setResult(parseReceiptQr(raw));}catch(e){setError(e instanceof Error?e.message:'Некорректный QR-код');}};
 return <div className="w-full min-w-0 space-y-3">
  <section className={SURFACE_CARD+' space-y-3'}>
   <h3 className="text-base font-semibold font-headline text-[var(--terra-ink)]">Реквизиты чека</h3>
   <p className="text-sm text-[var(--terra-muted)]">QR-код содержит реквизиты и итоговую сумму. Получение товарных позиций и проверка через ФНС пока не подключены. Этот экран не записывает операции в бюджет.</p>
   <form onSubmit={parse} className="space-y-2">
    <label htmlFor="receipt-qr-input" className="block text-sm font-medium">Строка QR-кода</label>
    <textarea id="receipt-qr-input" rows={3} value={raw} onChange={e=>{setRaw(e.target.value);setResult(null);setError('');}} placeholder="t=…&s=…&fn=…&i=…&fp=…&n=…" className="w-full min-w-0 rounded-xl p-3 text-base border border-[var(--terra-control-border)] bg-[var(--terra-surface)] text-[var(--terra-ink)]" />
    {error&&<p role="alert" className="text-sm text-[var(--terra-danger-text)]">{error}</p>}
    <button type="submit" disabled={!raw.trim()} className={TOOLBAR_ACTION+' '+TOOLBAR_ACTION_PRIMARY}>Показать реквизиты</button>
   </form>
  </section>
  {result&&<section aria-label="Реквизиты из QR-кода" className={SURFACE_CARD+' space-y-3'}>
   <h3 className="text-base font-semibold">Данные из QR-кода</h3>
   <div className="text-2xl font-headline font-semibold tabular-nums break-words">{settings.privacyMode?'•••':(result.amountKopecks/100).toLocaleString('ru-RU',{minimumFractionDigits:2,maximumFractionDigits:2})+' ₽'}</div>
   <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
    {Object.entries({'Дата':result.date,'ФН':result.fn,'ФД':result.fd,'ФП':result.fp,'Признак расчёта':result.operation}).map(([label,value])=><div key={label} className="min-w-0"><dt className="text-[var(--terra-muted)]">{label}</dt><dd className="break-all tabular-nums">{settings.privacyMode&&label!=='Дата'?'•••':value}</dd></div>)}
   </dl>
   <p className="text-sm text-[var(--terra-muted)]">Подлинность не проверена. Товарные позиции отсутствуют.</p>
  </section>}
 </div>;
};
export default FnsReceiptScanner;
