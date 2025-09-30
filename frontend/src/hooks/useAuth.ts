import { useCallback, useMemo, useState } from 'react';
import { authApi, clearTokens, getTokens, setTokens } from '../services/api';

export function useAuth() {
  const [tokens, setTok] = useState(getTokens());

  const login = useCallback(async (username: string, password: string) => {
    const res: any = await authApi.login({ username, password });
    const data = res.data || res;
    if (data?.accessToken) {
      setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
      setTok(getTokens());
    }
  }, []);

  const logout = useCallback(async () => {
    if (tokens.refreshToken) await authApi.logout(tokens.refreshToken);
    clearTokens();
    setTok(getTokens());
  }, [tokens.refreshToken]);

  return useMemo(() => ({ tokens, isAuthenticated: !!tokens.accessToken, login, logout }), [tokens, login, logout]);
}


