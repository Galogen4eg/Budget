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
import { AuthErrorInfo } from '../components/AuthErrorModal';

export function parseAuthError(error: any): AuthErrorInfo {
  const rawCode = String(error?.code || '');
  const rawMsg = String(error?.message || error || 'Неизвестная ошибка');
  const host = typeof window !== 'undefined' ? window.location.hostname : 'ваш домен';

  if (rawCode === 'auth/unauthorized-domain' || rawMsg.includes('unauthorized-domain')) {
    return {
      code: 'auth/unauthorized-domain',
      title: 'Домен не добавлен в Firebase Console',
      description: `Firebase заблокировал попытку входа, так как текущий домен (${host}) не добавлен в список авторизованных доменов вашего Firebase проекта.`,
      actionHint: `Перейдите в Firebase Console -> Authentication -> Settings -> Authorized domains (Авторизованные домены), нажмите "Add domain" и введите: ${host}`,
      rawMessage: rawMsg
    };
  }

  if (rawCode.includes('api-key-not-valid') || rawCode === 'auth/invalid-api-key' || rawMsg.includes('api-key-not-valid') || rawMsg.includes('invalid-api-key')) {
    return {
      code: 'auth/invalid-api-key',
      title: 'Недействительный API-ключ Firebase',
      description: 'Переданный API-ключ Firebase (VITE_FIREBASE_API_KEY) недействителен, просрочен или заблокирован ограничениями в Google Cloud Console.',
      actionHint: 'Укажите верный VITE_FIREBASE_API_KEY в переменных окружения вашего хостинга или перейдите в «Локальный демо-режим» для тестирования.',
      rawMessage: rawMsg
    };
  }

  if (rawCode === 'auth/operation-not-allowed' || rawMsg.includes('operation-not-allowed')) {
    return {
      code: 'auth/operation-not-allowed',
      title: 'Вход через Google отключен в Firebase',
      description: 'Провайдер авторизации Google выключен в настройках вашего Firebase проекта.',
      actionHint: 'Перейдите в Firebase Console -> Authentication -> Sign-in method (Способы входа), нажмите на "Google", включите переключатель (Enable) и сохраните.',
      rawMessage: rawMsg
    };
  }

  if (rawCode === 'auth/popup-blocked' || rawCode === 'auth/cancelled-popup-request') {
    return {
      code: rawCode,
      title: 'Всплывающее окно заблокировано',
      description: 'Браузер отменил или заблокировал всплывающее окно входа Google.',
      actionHint: 'Разрешите всплывающие окна для этого сайта в настройках браузера и нажмите "Войти через Google" еще раз.',
      rawMessage: rawMsg
    };
  }

  if (rawCode === 'auth/popup-closed-by-user') {
    return {
      code: 'auth/popup-closed-by-user',
      title: 'Вход отменён пользователем',
      description: 'Окно авторизации Google было закрыто до выбора аккаунта.',
      actionHint: 'Нажмите "Войти через Google" заново и завершите выбор аккаунта.',
      rawMessage: rawMsg
    };
  }

  if (rawCode === 'auth/network-request-failed') {
    return {
      code: 'auth/network-request-failed',
      title: 'Ошибка сетевого соединения',
      description: 'Не удалось связаться с серверами авторизации Google / Firebase.',
      actionHint: 'Проверьте интернет-соединение, отключите блокировщик рекламы/VPN или повторите попытку позже.',
      rawMessage: rawMsg
    };
  }

  return {
    code: rawCode || 'auth/unknown-error',
    title: 'Ошибка авторизации Google',
    description: `Произошел сбой при попытке авторизоваться. Детали: ${rawMsg}`,
    actionHint: 'Проверьте домен в Firebase Console, корректность API ключей и настройки OAuth провайдера.',
    rawMessage: rawMsg
  };
}

interface AuthContextType {
  user: User | null;
  familyId: string | null;
  loading: boolean;
  isOfflineMode: boolean;
  authError: AuthErrorInfo | null;
  clearAuthError: () => void;
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
    authError: null,
    clearAuthError: () => {},
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
  const [authError, setAuthError] = useState<AuthErrorInfo | null>(null);

  const clearAuthError = () => setAuthError(null);

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
      setAuthError(null);
  };

  useEffect(() => {
    let unsubscribe: () => void;
    const safetyTimer = setTimeout(() => { if (loading) setLoading(false); }, 7000);

    const initAuth = async () => {
       try { 
         const result = await getRedirectResult(auth);
         if (result?.user) {
           toast.success('Успешный вход через Google!');
         }
       } catch (e: any) { 
         console.error("Redirect auth error:", e);
         if (e.code && e.code !== 'auth/popup-closed-by-user') {
           const parsed = parseAuthError(e);
           setAuthError(parsed);
         }
       }

       unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
        if (currentUser) {
          setUser(currentUser);
          setAuthError(null);
          
          // Проверка отложенного вступления в семью (после логина Google)
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
      setAuthError(null);
      if (targetFamilyId?.trim()) {
          localStorage.setItem('pending_join_family', targetFamilyId.trim());
      }
      
      try {
          await signInWithPopup(auth, googleProvider);
      } catch (error: any) {
          console.error("Google login error:", error);
          const parsed = parseAuthError(error);
          setAuthError(parsed);
          
          if (parsed.code === 'auth/popup-blocked' || parsed.code === 'auth/cancelled-popup-request') {
              try {
                  await signInWithRedirect(auth, googleProvider);
                  return;
              } catch (redirectErr: any) {
                  setAuthError(parseAuthError(redirectErr));
              }
          }
          localStorage.removeItem('pending_join_family');
      }
  };

  const loginWithEmail = async (email: string, pass: string) => {
      setLoading(true);
      setAuthError(null);
      try {
          await signInWithEmailAndPassword(auth, email, pass);
          toast.success('С возвращением!');
      } catch (e: any) {
          const parsed = parseAuthError(e);
          if (parsed.code === 'auth/invalid-api-key') {
              setAuthError(parsed);
          } else {
              toast.error('Неверный логин или пароль');
          }
          setLoading(false);
      }
  };

  const registerWithEmail = async (email: string, pass: string, targetFamilyId?: string) => {
      setLoading(true);
      setAuthError(null);
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
          const parsed = parseAuthError(e);
          if (parsed.code === 'auth/invalid-api-key') {
              setAuthError(parsed);
          } else {
              let msg = 'Ошибка при регистрации';
              if (e.code === 'auth/email-already-in-use') msg = 'Этот email уже занят';
              if (e.code === 'auth/weak-password') msg = 'Слишком слабый пароль (мин. 6 симв.)';
              toast.error(msg);
          }
          setLoading(false);
      }
  };

  const loginAnonymously = async () => {
      setLoading(true);
      setAuthError(null);
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
      setAuthError(null);
  };

  return (
    <AuthContext.Provider value={{ 
        user, familyId, loading, isOfflineMode, authError, clearAuthError,
        loginWithGoogle, loginAnonymously, loginWithEmail, registerWithEmail, 
        enterDemoMode, logout 
    }}>
      {children}
    </AuthContext.Provider>
  );
};