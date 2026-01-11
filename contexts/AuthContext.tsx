
import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  signInAnonymously, 
  signInWithPopup, 
  signInWithRedirect, 
  getRedirectResult,
  signOut
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { getOrInitUserFamily } from '../utils/db';

interface AuthContextType {
  user: User | null;
  familyId: string | null;
  loading: boolean;
  isOfflineMode: boolean;
  loginWithGoogle: () => Promise<void>;
  loginAnonymously: () => Promise<void>;
  enterDemoMode: () => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({ 
    user: null, 
    familyId: null, 
    loading: true, 
    isOfflineMode: false,
    loginWithGoogle: async () => {},
    loginAnonymously: async () => {},
    enterDemoMode: () => {},
    logout: async () => {}
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOfflineMode, setIsOfflineMode] = useState(false);

  // Helper to enable local demo mode consistently
  const enterDemoMode = () => {
      console.warn("Switching to Local Demo Mode");
      const mockUser = {
          uid: 'demo-local-user',
          displayName: 'Демо Пользователь',
          email: 'demo@local',
          isAnonymous: true,
          getIdToken: async () => 'mock',
          photoURL: null
      } as unknown as User;

      setUser(mockUser);
      setFamilyId(null); // Null familyId triggers local storage mode in DataContext
      setIsOfflineMode(true);
      setLoading(false);
  };

  useEffect(() => {
    let unsubscribe: () => void;

    // Failsafe timer: Если Firebase не инициализировался за 7 секунд (например, завис Redirect на Android),
    // принудительно убираем загрузку, чтобы пользователь мог выбрать Демо-режим.
    const safetyTimer = setTimeout(() => {
        if (loading) {
            console.warn("Auth initialization timed out. Forcing app load.");
            setLoading(false);
        }
    }, 7000);

    const initAuth = async () => {
       // Check for redirect result (from signInWithRedirect fallback)
       try {
         await getRedirectResult(auth);
       } catch (e: any) {
         console.error("Redirect auth error:", e);
       }

       unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
        if (currentUser) {
          setUser(currentUser);
          
          const cachedFid = localStorage.getItem('cached_familyId');

          try {
            const fid = await getOrInitUserFamily(currentUser);
            if (fid) {
                setFamilyId(fid);
                localStorage.setItem('cached_familyId', fid);
                setIsOfflineMode(false);
            } else {
                console.error("Family ID is null after init");
            }
          } catch (e) {
            console.error("Family Init Failed:", e);
            if (cachedFid) {
                setFamilyId(cachedFid);
            }
            setIsOfflineMode(true);
          }
        } else {
          // Пользователь вышел
          setUser(null);
          setFamilyId(null);
          localStorage.removeItem('cached_familyId');
        }
        
        // Auth state resolved (either logged in or not), remove loader
        clearTimeout(safetyTimer);
        setLoading(false);
      });
    };

    initAuth();

    return () => {
      clearTimeout(safetyTimer);
      if (unsubscribe) unsubscribe();
    };
  }, []); 

  const loginWithGoogle = async () => {
      setLoading(true);
      try {
          await signInWithPopup(auth, googleProvider);
      } catch (error: any) {
          console.error("Google Auth Error:", error);
          
          // Handle Network Errors (Offline or Blocked)
          if (error.code === 'auth/network-request-failed') {
              if (confirm("Ошибка соединения с сервером. Войти в локальный Демо-режим?")) {
                  enterDemoMode();
                  return;
              }
          }

          // На мобильных устройствах popup часто блокируется, пробуем редирект
          if (error.code === 'auth/popup-blocked' || error.code === 'auth/popup-closed-by-user' || error.code === 'auth/operation-not-supported-in-this-environment') {
              try {
                  await signInWithRedirect(auth, googleProvider);
                  return;
              } catch (redirectError: any) {
                  console.error("Redirect Error:", redirectError);
                  if (redirectError.code === 'auth/network-request-failed') {
                      if (confirm("Ошибка соединения. Войти в локальный Демо-режим?")) {
                          enterDemoMode();
                          return;
                      }
                  }
              }
          }
          setLoading(false);
          alert(`Ошибка входа через Google. Для APK используйте Демо-режим, если не настроен SHA-1. Ошибка: ${error.message}`);
      }
  };

  const loginAnonymously = async () => {
      setLoading(true);
      try {
          await signInAnonymously(auth);
      } catch (e: any) {
          console.error("Auth Error:", e);
          const msg = e.message || '';
          const code = e.code || '';
          
          // Локальный демо режим, если Firebase Auth недоступен или отключен
          if (code === 'auth/network-request-failed' || code === 'auth/admin-restricted-operation' || msg.includes('admin-restricted') || msg.includes('network-request-failed')) {
              enterDemoMode();
              return;
          }
          
          alert(`Ошибка входа: ${msg}`);
          setLoading(false); 
      }
  };

  const logout = async () => {
      try {
          await signOut(auth);
      } catch (e) {
          console.warn("Sign out error", e);
      }
      setUser(null);
      setFamilyId(null);
      localStorage.removeItem('cached_familyId');
      setIsOfflineMode(false);
  };

  return (
    <AuthContext.Provider value={{ user, familyId, loading, isOfflineMode, loginWithGoogle, loginAnonymously, enterDemoMode, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
