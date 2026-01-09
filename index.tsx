
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
// @ts-ignore
import { registerSW } from 'virtual:pwa-register';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Автоматическая регистрация и обновление Service Worker
const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm('Доступно обновление. Перезагрузить?')) {
      updateSW(true);
    }
  },
  onOfflineReady() {
    console.log('App ready to work offline');
  },
});

const root = createRoot(rootElement);
root.render(
  <React.StrictMode>
    <AuthProvider>
      <DataProvider>
        <App />
      </DataProvider>
    </AuthProvider>
  </React.StrictMode>
);
