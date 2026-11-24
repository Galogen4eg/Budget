import React from 'react';

export default function TerraSplash({slow=false,onDemo}:{slow?:boolean;onDemo?:()=>void}){
  return (
    <div className="terra-splash">
      <div className="terra-splash-inner">
        <picture>
          <source media="(max-width: 767px), (orientation: portrait)" srcSet="/terra-mobile.webp" type="image/webp" />
          <img src="/terra-desktop.webp" alt="" fetchPriority="high" decoding="async" />
        </picture>
        <h1 className="terra-splash-title">Terra</h1>
        <p className="terra-splash-subtitle">Бюджет и планирование</p>
        <div className="terra-splash-progress" aria-hidden="true"><span /></div>
        <p className="terra-splash-status" role="status">Загружаем данные…</p>
        <div className="terra-splash-help-slot">
          {slow&&onDemo&&(
            <div className="terra-splash-help">
              <p role="status">Синхронизация занимает чуть больше времени.</p>
              <button type="button" onClick={onDemo}>Открыть в автономном режиме</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
