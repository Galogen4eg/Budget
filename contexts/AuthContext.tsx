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
  signInWithEmailAndPassword,
  sendPasswordResetEmail
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { getOrInitUserFamily, getPendingFamilyInvitation, joinFamily } from '../utils/db';
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
  resetPassword: (email: string) => Promise<void>;
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
    resetPassword: async () => {},
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
    let unsubscribe: (() => void) | undefined;
    let isMounted = true;

    // Never expose a guessed family while Firestore membership is unresolved.
    // The loading state is cleared only after the auth callback finishes.

    // Run getRedirectResult in background without blocking onAuthStateChanged
    getRedirectResult(auth).catch((e) => {
      console.warn("Background redirect auth check:", e);
    });

    try {
      unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
        if (!isMounted) return;

        if (currentUser) {
          setUser(currentUser);
          
          // A pending family ID is a request, not permission to join.
          const pendingFid = localStorage.getItem('pending_join_family');
          if (pendingFid) {
            const accepted = window.confirm('Присоединиться к указанному семейному пространству? Для доступа требуется приглашение на email вашего аккаунта.');
            if (!accepted) {
              localStorage.removeItem('pending_join_family');
            } else {
              try {
                await joinFamily(currentUser, pendingFid);
                localStorage.removeItem('pending_join_family');
                toast.success('Вы присоединились к семейному пространству');
              } catch (e: any) {
                console.error('Failed to join pending family:', e);
                toast.error(`Не удалось присоединиться: ${e.message}`);
              }
            }
          }

          try {
            // An email invitation is only an offer. Never move an existing
            // account to another family without the user's explicit consent.
            try {
              const invitation = await getPendingFamilyInvitation(currentUser);
              if (invitation && !pendingFid) {
                const dismissedKey = `dismissed_family_invite_${currentUser.uid}_${invitation.familyId}`;
                if (sessionStorage.getItem(dismissedKey) !== '1') {
                  const accepted = window.confirm('Вас пригласили в общее семейное пространство. Присоединиться? Ваши прежние данные не будут перенесены автоматически.');
                  if (accepted) {
                    await joinFamily(currentUser, invitation.familyId);
                    toast.success('Вы присоединились к общему семейному пространству');
                  } else {
                    sessionStorage.setItem(dismissedKey, '1');
                  }
                }
              }
            } catch (inviteError) {
              // An invitation lookup/join failure must not block the user's
              // existing family from loading.
              console.error('Unable to process family invitation:', inviteError);
              toast.error('Не удалось обработать приглашение. Ваше текущее пространство сохранено.');
            }
            const fid = await getOrInitUserFamily(currentUser);
            if (fid && isMounted) {
              setFamilyId(fid);
              localStorage.setItem('cached_familyId', fid);
              setIsOfflineMode(false);
            }
          } catch (e) {
            console.error("Family initialization failed; refusing to use an unverified family ID:", e);
            if (isMounted) {
              setFamilyId(null);
              setIsOfflineMode(false);
              toast.error('Не удалось загрузить семейное пространство. Проверьте соединение и повторите вход.');
            }
          }
        } else {
          if (isMounted) {
            setUser(null);
            setFamilyId(null);
            localStorage.removeItem('cached_familyId');
          }
        }

        if (isMounted) {
          setLoading(false);
        }
      });
    } catch (err) {
      console.error("Failed to attach auth listener:", err);
      if (isMounted) {
        setLoading(false);
      }
    }

    return () => {
      isMounted = false;
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
          const errorCode = error?.code || '';
          
          if (errorCode === 'auth/popup-closed-by-user' || errorCode === 'auth/cancelled-popup-request') {
              toast.info('Вход через Google отменён');
              localStorage.removeItem('pending_join_family');
              return;
          }

          if (errorCode === 'auth/unauthorized-domain') {
              toast.error(
                `Домен (${window.location.hostname}) не авторизован в Firebase Console. Добавьте его в Firebase Console -> Authentication -> Settings -> Authorized domains или используйте вход по Email.`
              );
              localStorage.removeItem('pending_join_family');
              return;
          }

          if (['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment'].includes(errorCode)) {
              try {
                  await signInWithRedirect(auth, googleProvider);
              } catch (redirectErr: any) {
                  toast.error(`Не удалось перенаправить: ${redirectErr.message}`);
                  localStorage.removeItem('pending_join_family');
              }
          } else {
              toast.error(`Ошибка входа Google: ${error.message || errorCode}`);
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
          setLoading(false);
          throw e;
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
          setLoading(false);
          throw new Error(msg);
      }
  };

  const resetPassword = async (email: string) => {
      if (!email.trim()) {
          toast.error('Введите ваш email');
          return;
      }
      try {
          await sendPasswordResetEmail(auth, email.trim());
          toast.success(`Ссылка для сброса/задания пароля отправлена на ${email}`);
      } catch (e: any) {
          toast.error(`Ошибка отправки: ${e.message || 'Не удалось отправить письмо'}`);
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
        resetPassword, enterDemoMode, logout 
    }}>
      {children}
    </AuthContext.Provider>
  );
};