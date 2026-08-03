
/// <reference types="vite/client" />
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { 
  getFirestore, 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager 
} from 'firebase/firestore';
import { getMessaging } from 'firebase/messaging';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "dummy",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "dummy",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "dummy",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "dummy",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "dummy",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "dummy",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "dummy"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Настройка провайдера с принудительным окном выбора аккаунта
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');
googleProvider.setCustomParameters({
    prompt: 'select_account'
});

// Initialize Firestore with persistent local cache (Offline support)
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  }),
  ignoreUndefinedProperties: true // CRITICAL: Allows saving objects with undefined fields without crashing
});

// Initialize Messaging (Optional, only if supported)
let messaging: any = null;
try {
    // Check for supported environment features before initializing to prevent "unsupported-browser" errors
    const isSupported = typeof window !== 'undefined' && 
                        'serviceWorker' in navigator && 
                        'PushManager' in window &&
                        'indexedDB' in window;

    if (isSupported) {
        messaging = getMessaging(app);
    }
} catch (e: any) {
    // Suppress the "unsupported-browser" error as it is expected in some environments (e.g. private mode, non-https)
    if (e.code !== 'messaging/unsupported-browser') {
        console.warn("Firebase Messaging failed to initialize", e);
    }
}
export { messaging };
