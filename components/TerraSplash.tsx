import React from 'react';

export default function TerraSplash({slow=false,onDemo}:{slow?:boolean;onDemo?:()=>void}){
  return (
    <div className="terra-splash">
      <div className="terra-splash-art" aria-hidden="true"><div className="terra-splash-image"/><div className="terra-splash-dots"><i/><i/><i/></div></div><div className="terra-splash-compact" aria-hidden="true"><span>Загружаем данные…</span><div className="terra-splash-dots"><i/><i/><i/></div></div>
      <span className="terra-splash-status" role="status">Terra. Загружаем данные…</span>
      {slow&&onDemo&&(
        <div className="terra-splash-help">
          <p>Синхронизация аккаунта занимает чуть дольше обычного…</p>
          <button type="button" onClick={onDemo}>Открыть в автономном режиме</button>
        </div>
      )}
    </div>
  );
}
