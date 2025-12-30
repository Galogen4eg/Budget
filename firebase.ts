
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { 
  getFirestore, 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager 
} from 'firebase/firestore';

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
export const googleProvider = new GoogleAuthProvider();

// Initialize Firestore with persistent local cache (Offline support)
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});
