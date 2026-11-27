import React from 'react';

export default function TerraSplash({slow=false,onDemo}:{slow?:boolean;onDemo?:()=>void}){
  return (
    <div className="terra-splash">
      <div className="terra-splash-art" aria-hidden="true"><div className="terra-splash-image"/><div className="terra-splash-dots"><i/><i/><i/></div></div><div className="terra-splash-compact" aria-hidden="true"><img className="terra-splash-logo" src="/icons/terra-icon.svg" alt="" width={56} height={56}/><span className="terra-splash-brand">Terra</span><span className="terra-splash-caption">Загружаем данные…</span><div className="terra-splash-dots"><i/><i/><i/></div></div>
      <span className="terra-splash-status" role="status">Terra. Загружаем данные…</span>
      {slow&&(
        <div className="terra-splash-help">
          <p role="status">Подключение к аккаунту занимает больше времени. {onDemo?'Можно открыть локальный режим без семейных данных.':'Проверьте соединение или повторите загрузку.'}</p>
          {onDemo?<button type="button" onClick={onDemo}>Открыть в автономном режиме</button>:<button type="button" onClick={()=>window.location.reload()}>Повторить загрузку</button>}
        </div>
      )}
    </div>
  );
}
