/* Firebase Messaging service worker, served at the domain root. */
importScripts(
  'https://www.gstatic.com/firebasejs/10.13.1/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.13.1/firebase-messaging-compat.js'
);
firebase.initializeApp({
  apiKey: 'AIzaSyDf2m3lM6CwhNzCdfPAlkpYxhN7nD1vwDw',
  authDomain: 'budg-1d5e0.firebaseapp.com',
  projectId: 'budg-1d5e0',
  messagingSenderId: '834262536808',
  appId: '1:834262536808:web:5d5593d0b9227eae6b21dd'
});
const messaging = firebase.messaging();
messaging.onBackgroundMessage(payload => {
  const data = payload.data || {};
  const title = typeof data.title === 'string' ? data.title : 'Budget';
  const body = typeof data.body === 'string' ? data.body : 'Новое напоминание';
  const tag = typeof data.tag === 'string' ? data.tag : undefined;
  self.registration.showNotification(title, {
    body,
    tag,
    icon: '/icons/terra-icon.svg',
    data: {url: '/'}
  });
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil((async () => {
    const windows = await clients.matchAll({type:'window',includeUncontrolled:true});
    const existing = windows.find(client => new URL(client.url).origin === self.location.origin);
    if (existing) return existing.focus();
    return clients.openWindow('/');
  })());
});

// Network-first navigation only. Never cache financial data, API responses,
// login callbacks, or a stale HTML shell referencing a previous deployment.
self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET'||request.mode!=='navigate')return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin||!['/','/index.html'].includes(url.pathname))return;
  event.respondWith(fetch(request,{cache:'no-store'}).catch(()=>new Response(
    '<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>Terra — нет сети</title><style>html{color-scheme:light dark}body{font:16px system-ui;margin:0;min-height:100dvh;display:grid;place-items:center;background:#FAF6F0;color:#1E2923}main{max-width:26rem;padding:24px}a{display:inline-block;background:#356143;color:white;border-radius:12px;padding:14px 20px;text-decoration:none}@media(prefers-color-scheme:dark){body{background:#121214;color:#f5f5f5}}</style><main><h1>Нет подключения</h1><p>Terra не может загрузить актуальные семейные данные. Проверьте интернет и повторите попытку. Данные не изменены этим экраном.</p><a href="/">Повторить</a></main></html>',
    {status:503,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}}
  )));
});
