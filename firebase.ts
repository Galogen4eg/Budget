
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
  apiKey: "AIzaSyDf2m3lM6CwhNzCdfPAlkpYxhN7nD1vwDw",
  authDomain: "budg-1d5e0.firebaseapp.com",
  databaseURL: "https://budg-1d5e0-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "budg-1d5e0",
  storageBucket: "budg-1d5e0.firebasestorage.app",
  messagingSenderId: "834262536808",
  appId: "1:834262536808:web:5d5593d0b9227eae6b21dd"
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
  })
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
