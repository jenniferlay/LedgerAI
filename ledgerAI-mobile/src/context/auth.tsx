import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

type AuthState = {
  isLoggedIn: boolean | null;
  authError: boolean;
  signIn: (token: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

async function getStoredToken(): Promise<string | null> {
  if (Platform.OS === 'web') {
    try {
      return typeof window !== 'undefined' ? window.localStorage.getItem('jwt') : null;
    } catch {
      return null;
    }
  }
  return SecureStore.getItemAsync('jwt');
}

async function setStoredToken(token: string): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('jwt', token);
      }
    } catch {
      // Ignore storage errors on web
    }
    return;
  }
  await SecureStore.setItemAsync('jwt', token);
}

async function deleteStoredToken(): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem('jwt');
      }
    } catch {
      // Ignore storage errors on web
    }
    return;
  }
  await SecureStore.deleteItemAsync('jwt');
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [authError, setAuthError] = useState(false);

  useEffect(() => {
    let isMounted = true;

    getStoredToken()
      .then((token) => {
        if (isMounted) {
          setIsLoggedIn(Boolean(token));
        }
      })
      .catch((error) => {
        console.error('Failed to read JWT from storage', error);
        if (isMounted) {
          setAuthError(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const signIn = useCallback(async (token: string) => {
    await setStoredToken(token);
    setIsLoggedIn(true);
  }, []);

  const signOut = useCallback(async () => {
    await deleteStoredToken();
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
