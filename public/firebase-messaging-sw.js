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
