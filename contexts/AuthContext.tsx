
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
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({ 
    user: null, 
    familyId: null, 
    loading: true, 
    isOfflineMode: false,
    loginWithGoogle: async () => {},
    loginAnonymously: async () => {},
    logout: async () => {}
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOfflineMode, setIsOfflineMode] = useState(false);

  useEffect(() => {
    let unsubscribe: () => void;

    const initAuth = async () => {
       // Check for redirect result (from signInWithRedirect fallback)
       try {
         await getRedirectResult(auth);
       } catch (e) {
         console.error("Redirect auth error:", e);
       }

       unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
        if (currentUser) {
          setUser(currentUser);
          
          // Попытка получить кэшированный familyId для ускорения (опционально)
          const cachedFid = localStorage.getItem('cached_familyId');
          // Но мы НЕ полагаемся только на него, всегда проверяем DB для авторизованных юзеров

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
            // Если ошибка сети/базы, но у нас есть кэш - пробуем работать с кэшем ID,
            // но флаг isOfflineMode переводим в true
            if (cachedFid) {
                setFamilyId(cachedFid);
            }
            setIsOfflineMode(true);
          }
          setLoading(false);
        } else {
          // Пользователь вышел
          setUser(null);
          setFamilyId(null);
          localStorage.removeItem('cached_familyId');
          setLoading(false);
        }
      });
    };

    initAuth();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []); 

  const loginWithGoogle = async () => {
      setLoading(true);
      try {
          await signInWithPopup(auth, googleProvider);
      } catch (error: any) {
          console.error("Google Auth Error:", error);
          if (error.code === 'auth/popup-blocked' || error.code === 'auth/popup-closed-by-user') {
              try {
                  await signInWithRedirect(auth, googleProvider);
                  return;
              } catch (redirectError) {
                  console.error("Redirect Error:", redirectError);
              }
          }
          setLoading(false);
          alert(`Ошибка входа через Google: ${error.message}`);
      }
  };

  const loginAnonymously = async () => {
      setLoading(true);
      try {
          await signInAnonymously(auth);
      } catch (e: any) {
          console.error("Auth Error:", e);
          const msg = e.message || '';
          
          // Локальный демо режим, если Firebase Auth недоступен
          if (msg.includes('admin-restricted') || msg.includes('network-request-failed')) {
              console.warn("Falling back to Local Demo Mode");
              // Mock User
              const mockUser = {
                  uid: 'demo-local-user',
                  displayName: 'Демо Пользователь',
                  email: 'demo@local',
                  isAnonymous: true,
                  getIdToken: async () => 'mock',
              } as unknown as User;

              setUser(mockUser);
              setFamilyId(null); // Explicit null triggers DataContext offline/demo mode
              setIsOfflineMode(true);
              setLoading(false);
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
    <AuthContext.Provider value={{ user, familyId, loading, isOfflineMode, loginWithGoogle, loginAnonymously, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
