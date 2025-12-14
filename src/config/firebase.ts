import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || 'AIzaSyDummyKey',
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || 'family-budget.firebaseapp.com',
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || 'family-budget',
  storageBucket: process.env.REACT_APP_FIRESTORE_STORAGE_BUCKET || 'family-budget.appspot.com',
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || '123456789',
  appId: process.env.REACT_APP_FIREBASE_APP_ID || '1:123456789:web:abcdef'
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export const signInAnonymouslyAndSetupRoom = async () => {
  try {
    const userCredential = await signInAnonymously(auth);
    const userId = userCredential.user.uid;
    
    // Generate or retrieve roomId from localStorage
    let roomId = localStorage.getItem('roomId');
    if (!roomId) {
      // Create a simple roomId based on timestamp and random values
      roomId = `${userId}_${Date.now()}`;
      localStorage.setItem('roomId', roomId);
    }
    
    return { userId, roomId };
  } catch (error) {
    console.error('Error signing in anonymously:', error);
    throw error;
  }
};