import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  AuthSuccessResponse,
  AuthTokens,
  ApiResponse,
  authApi,
  clearTokens,
  getTokens,
  setTokens,
  subscribeToTokenChanges
} from '../services/api';

export type AuthenticatedUser = {
  id: string;
  email: string;
  username: string;
  firstName?: string | null;
  lastName?: string | null;
  roles?: string[];
  isActive?: boolean;
  emailVerified?: boolean;
  lastLoginAt?: string | Date | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  [key: string]: unknown;
};

type AuthContextValue = {
  tokens: AuthTokens;
  user: AuthenticatedUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<AuthSuccessResponse>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  setUser: (user: AuthenticatedUser | null) => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function extractData<T>(response: ApiResponse<T>): T {
  return (response as any)?.data ?? (response as any);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [tokens, setTokenState] = useState<AuthTokens>(() => getTokens());
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Sync token changes triggered outside the provider (e.g. refresh flow)
  useEffect(() => {
    const unsubscribe = subscribeToTokenChanges(nextTokens => {
      setTokenState(nextTokens);
    });
    return unsubscribe;
  }, []);

  // Bootstrap user profile when tokens change
  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      if (!tokens.accessToken) {
        setUser(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const profileResponse = await authApi.getProfile();
        const profile = extractData<AuthenticatedUser>(profileResponse);
        if (!cancelled) {
          setUser(profile ?? null);
        }
      } catch (error) {
        if (!cancelled) {
          clearTokens();
          setUser(null);
          setTokenState(getTokens());
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, [tokens.accessToken]);

  const login = useCallback(async (username: string, password: string) => {
    const result = await authApi.login({ username, password });
    const data = extractData<AuthSuccessResponse>(result);
    if (data?.accessToken) {
      setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
      setTokenState(getTokens());
      if (data.user) {
        setUser(data.user);
      }
    }
    return data;
  }, []);

  const logout = useCallback(async () => {
    try {
      if (tokens.refreshToken) {
        await authApi.logout(tokens.refreshToken);
      }
    } catch {
      // Ignore logout errors to ensure client state is cleared
    } finally {
      clearTokens();
      setTokenState(getTokens());
      setUser(null);
    }
  }, [tokens.refreshToken]);

  const refresh = useCallback(async () => {
    if (!tokens.refreshToken) return;
    try {
      const data = await authApi.refresh(tokens.refreshToken);
      if (data?.accessToken) {
        setTokens({
          accessToken: data.accessToken,
          refreshToken: data.refreshToken || tokens.refreshToken
        });
        setTokenState(getTokens());
        if (data.user) {
          setUser(data.user);
        }
      }
    } catch {
      clearTokens();
      setTokenState(getTokens());
      setUser(null);
    }
  }, [tokens.refreshToken]);

  const value = useMemo<AuthContextValue>(
    () => ({
      tokens,
      user,
      loading,
      isAuthenticated: Boolean(tokens.accessToken && user),
      login,
      logout,
      refresh,
      setUser
    }),
    [tokens, user, loading, login, logout, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return ctx;
}
