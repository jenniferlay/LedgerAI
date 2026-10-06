import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import * as SecureStore from 'expo-secure-store';

type AuthState = {
  isLoggedIn: boolean | null;
  authError: boolean;
  signIn: (token: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [authError, setAuthError] = useState(false);

  useEffect(() => {
    let isMounted = true;

    SecureStore.getItemAsync('jwt')
      .then((token) => {
        if (isMounted) {
          setIsLoggedIn(Boolean(token));
        }
      })
      .catch((error) => {
        console.error('Failed to read JWT from SecureStore', error);
        if (isMounted) {
          setAuthError(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const signIn = useCallback(async (token: string) => {
    await SecureStore.setItemAsync('jwt', token);
    setIsLoggedIn(true);
  }, []);

  const signOut = useCallback(async () => {
    await SecureStore.deleteItemAsync('jwt');
    setIsLoggedIn(false);
  }, []);

  const value = useMemo(
    () => ({ isLoggedIn, authError, signIn, signOut }),
    [isLoggedIn, authError, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return context;
}
