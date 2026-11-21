import { getApp } from 'firebase/app';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { deleteToken, getMessaging, getToken, isSupported } from 'firebase/messaging';

const functions = getFunctions(getApp(), 'europe-west1');
const tokenKey = (uid:string) => `budget:calendar-fcm-token:${uid}`;
const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined;

export async function enableCalendarPush(uid:string):Promise<'enabled'|'not-configured'|'unsupported'|'denied'> {
  if (!vapidKey) return 'not-configured';
  if (!('serviceWorker' in navigator) || !('PushManager' in window) ||
      typeof Notification === 'undefined' || !(await isSupported())) return 'unsupported';
  if (Notification.permission === 'default') await Notification.requestPermission();
  if (Notification.permission !== 'granted') return 'denied';

  const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
  const messaging = getMessaging();
  const token = await getToken(messaging, {vapidKey, serviceWorkerRegistration:registration});
  if (!token) throw new Error('Браузер не выдал токен для фоновых уведомлений');

  const register = httpsCallable<{token:string;timezone:string},{enabled:boolean}>(
    functions, 'registerCalendarPush'
  );
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (!timezone) throw new Error('Не удалось определить часовой пояс устройства');
  await register({token,timezone});
  localStorage.setItem(tokenKey(uid),token);
  return 'enabled';
}

export async function disableCalendarPush(uid:string):Promise<void> {
  const token=localStorage.getItem(tokenKey(uid));
  if (!token) return;
  const unregister=httpsCallable<{token:string},{enabled:boolean}>(functions,'unregisterCalendarPush');
  await unregister({token});
  localStorage.removeItem(tokenKey(uid));
  if (await isSupported()) {
    // Prevent receiving notifications on this browser after the user opts out.
    await deleteToken(getMessaging());
  }
}

export function isCalendarPushRegisteredLocally(uid:string):boolean {
  return Boolean(localStorage.getItem(tokenKey(uid)));
}
