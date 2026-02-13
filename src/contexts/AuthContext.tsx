
import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  onAuthStateChanged, 
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
  loginWithGoogle: (targetFamilyId?: string) => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string, familyId?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({ 
    user: null, 
    familyId: null, 
    loading: true, 
    loginWithGoogle: async () => {},
    loginWithEmail: async () => {},
    registerWithEmail: async () => {},
    logout: async () => {}
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribe: () => void;
    const safetyTimer = setTimeout(() => { if (loading) setLoading(false); }, 7000);

    const initAuth = async () => {
       try { await getRedirectResult(auth); } catch (e) { console.error("Redirect auth error:", e); }

       unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
        if (currentUser) {
          setUser(currentUser);
          
          const pendingFid = localStorage.getItem('pending_join_family');
          if (pendingFid) {
              try {
                  await joinFamily(currentUser, pendingFid);
                  toast.success('Вы успешно вошли и присоединились к семье!');
              } catch (e: any) {
                  console.error("Failed to join pending family:", e);
                  toast.error(`Не удалось присоединиться: ${e.message}`);
              } finally {
                  localStorage.removeItem('pending_join_family');
              }
          }

          try {
            const fid = await getOrInitUserFamily(currentUser);
            if (fid) {
                setFamilyId(fid);
            }
          } catch (e) {
            console.error("Error fetching family:", e);
            toast.error("Ошибка загрузки данных профиля. Проверьте интернет.");
          }
        } else {
          setUser(null);
          setFamilyId(null);
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
              toast.success('Добро пожаловать!');
          }
      } catch (e: any) {
          let msg = 'Ошибка при регистрации';
          if (e.code === 'auth/email-already-in-use') msg = 'Этот email уже занят';
          if (e.code === 'auth/weak-password') msg = 'Слишком слабый пароль (мин. 6 симв.)';
          toast.error(msg);
          setLoading(false);
      }
  };

  const logout = async () => {
      await signOut(auth);
      setUser(null);
      setFamilyId(null);
  };

  return (
    <AuthContext.Provider value={{ 
        user, familyId, loading, 
        loginWithGoogle, loginWithEmail, registerWithEmail, 
        logout 
    }}>
      {children}
    </AuthContext.Provider>
  );
};
