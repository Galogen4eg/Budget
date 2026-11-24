import React from 'react';

export default function TerraSplash({slow=false,onDemo}:{slow?:boolean;onDemo?:()=>void}){
  return (
    <div className="terra-splash">
      <picture>
        <source media="(max-width: 767px), (orientation: portrait)" srcSet="/terra-mobile.webp" type="image/webp" />
        <img src="/terra-desktop.webp" alt="" fetchPriority="high" decoding="async" />
      </picture>
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
