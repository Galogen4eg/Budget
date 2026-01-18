import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  signInAnonymously, 
  signInWithPopup, 
  signInWithRedirect, 
  getRedirectResult,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { getOrInitUserFamily, joinFamily } from '../utils/db';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  familyId: string | null;
  loading: boolean;
  isOfflineMode: boolean;
  loginWithGoogle: (targetFamilyId?: string) => Promise<void>;
  loginAnonymously: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string, familyId?: string) => Promise<void>;
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
    loginWithEmail: async () => {},
    registerWithEmail: async () => {},
    enterDemoMode: () => {},
    logout: async () => {}
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOfflineMode, setIsOfflineMode] = useState(false);

  const enterDemoMode = () => {
      const mockUser = {
          uid: 'demo-local-user',
          displayName: 'Демо Пользователь',
          email: 'demo@local',
          isAnonymous: true,
          getIdToken: async () => 'mock',
          photoURL: null
      } as unknown as User;

      setUser(mockUser);
      setFamilyId(null);
      setIsOfflineMode(true);
      setLoading(false);
  };

  useEffect(() => {
    let unsubscribe: () => void;
    const safetyTimer = setTimeout(() => { if (loading) setLoading(false); }, 7000);

    const initAuth = async () => {
       try { await getRedirectResult(auth); } catch (e) { console.error("Redirect auth error:", e); }

       unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
        if (currentUser) {
          setUser(currentUser);
          
          // Check for a pending family join (from Google login flow)
          const pendingFid = localStorage.getItem('pending_join_family');
          if (pendingFid) {
              try {
                  await joinFamily(currentUser, pendingFid);
                  toast.success('Вы успешно вошли и присоединились к семье!');
              } catch (e: any) {
                  console.error("Failed to join pending family:", e);
                  toast.error(`Не удалось присоединиться к семье: ${e.message}`);
              } finally {
                  localStorage.removeItem('pending_join_family');
              }
          }

          const cachedFid = localStorage.getItem('cached_familyId');
          try {
            const fid = await getOrInitUserFamily(currentUser);
            if (fid) {
                setFamilyId(fid);
                localStorage.setItem('cached_familyId', fid);
                setIsOfflineMode(false);
            }
          } catch (e) {
            if (cachedFid) setFamilyId(cachedFid);
            setIsOfflineMode(true);
          }
        } else {
          setUser(null);
          setFamilyId(null);
          localStorage.removeItem('cached_familyId');
        }
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

  const loginWithGoogle = async (targetFamilyId?: string) => {
      if (targetFamilyId?.trim()) {
          localStorage.setItem('pending_join_family', targetFamilyId.trim());
      }
      
      try {
          await signInWithPopup(auth, googleProvider);
      } catch (error: any) {
          const errorCode = error.code;
          if (['auth/popup-blocked', 'auth/popup-closed-by-user', 'auth/operation-not-supported-in-this-environment'].includes(errorCode)) {
              await signInWithRedirect(auth, googleProvider);
          } else {
              toast.error(`Ошибка входа: ${error.message}`);
              localStorage.removeItem('pending_join_family');
          }
      }
  };

  const loginWithEmail = async (email: string, pass: string) => {
      setLoading(true);
      try {
          await signInWithEmailAndPassword(auth, email, pass);
          toast.success('С возвращением!');
      } catch (e: any) {
          toast.error('Неверный логин или пароль');
          setLoading(false);
      }
  };

  const registerWithEmail = async (email: string, pass: string, targetFamilyId?: string) => {
      setLoading(true);
      try {
          const res = await createUserWithEmailAndPassword(auth, email, pass);
          if (targetFamilyId && targetFamilyId.trim()) {
              try {
                  await joinFamily(res.user, targetFamilyId.trim());
                  toast.success('Аккаунт создан, вы добавлены в семью!');
              } catch (joinErr: any) {
                  toast.error(`Аккаунт создан, но войти в семью не удалось: ${joinErr.message}`);
              }
          } else {
              toast.success('Добро пожаловать в новый бюджет!');
          }
      } catch (e: any) {
          let msg = 'Ошибка при регистрации';
          if (e.code === 'auth/email-already-in-use') msg = 'Этот email уже занят';
          if (e.code === 'auth/weak-password') msg = 'Слишком слабый пароль (мин. 6 симв.)';
          toast.error(msg);
          setLoading(false);
      }
  };

  const loginAnonymously = async () => {
      setLoading(true);
      try {
          await signInAnonymously(auth);
      } catch (e: any) {
          enterDemoMode();
      }
  };

  const logout = async () => {
      await signOut(auth);
      setUser(null);
      setFamilyId(null);
      setIsOfflineMode(false);
  };

  return (
    <AuthContext.Provider value={{ 
        user, familyId, loading, isOfflineMode, 
        loginWithGoogle, loginAnonymously, loginWithEmail, registerWithEmail, 
        enterDemoMode, logout 
    }}>
      {children}
    </AuthContext.Provider>
  );
};