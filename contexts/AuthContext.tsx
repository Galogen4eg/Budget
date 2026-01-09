
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
          
          // Try to get cached family ID first to speed up load / enable offline
          const cachedFid = localStorage.getItem('cached_familyId');
          if (cachedFid) {
              setFamilyId(cachedFid);
          }

          try {
            const fid = await getOrInitUserFamily(currentUser);
            if (fid) {
                setFamilyId(fid);
                localStorage.setItem('cached_familyId', fid);
            }
          } catch (e) {
            console.error("Family Init Error (Likely Offline):", e);
            setIsOfflineMode(true);
            // If we have a cached ID, we are fine. If not, user is stuck offline without data access.
            if (!cachedFid) {
                // Potential improvement: allow creating local-only family here
            }
          }
          setLoading(false);
        } else {
          // No user found - stop loading and let the LoginScreen handle it
          // Only reset if we are NOT in local demo mode
          if (loading) {
             setLoading(false);
          }
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
                  // Fallback to redirect if popup is blocked
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
          const code = e.code || '';
          const msg = e.message || '';
          
          // 1. Fallback for disabled Anonymous Auth in Firebase Console
          if (code === 'auth/admin-restricted-operation' || msg.includes('admin-restricted-operation')) {
              console.warn("Anonymous auth disabled on server. Entering Local Demo Mode.");
              
              // Create a Mock User
              const mockUser = {
                  uid: 'demo-local-user',
                  displayName: 'Демо Пользователь',
                  email: 'demo@local',
                  emailVerified: true,
                  isAnonymous: true,
                  metadata: {},
                  providerData: [],
                  refreshToken: '',
                  tenantId: null,
                  delete: async () => {},
                  getIdToken: async () => 'mock-token',
                  getIdTokenResult: async () => ({ token: 'mock', createTime: '', expirationTime: '', authTime: '', signInProvider: 'anon', claims: {}, signInSecondFactor: null, issuedAtTime: '' }),
                  reload: async () => {},
                  toJSON: () => ({}),
                  phoneNumber: null,
                  photoURL: null,
              } as unknown as User;

              setUser(mockUser);
              setFamilyId(null); 
              setIsOfflineMode(true);
              setLoading(false);
              return;
          }

          console.error("Auth Error:", e);

          // 2. Check specifically for network error
          if (code === 'auth/network-request-failed' || msg.includes('network-request-failed')) {
              console.warn("Auth: Network request failed. Running in Offline/Demo mode.");
              setIsOfflineMode(true);
          } else {
              alert(`Ошибка входа: ${msg}`);
          }
          setLoading(false); 
      }
  };

  const logout = async () => {
      try {
          await signOut(auth);
          localStorage.removeItem('cached_familyId');
      } catch (e) {
          console.warn("Sign out error", e);
      }
      setUser(null);
      setFamilyId(null);
      setIsOfflineMode(false);
  };

  return (
    <AuthContext.Provider value={{ user, familyId, loading, isOfflineMode, loginWithGoogle, loginAnonymously, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
