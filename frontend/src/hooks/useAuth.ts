import { AuthProvider, useAuthContext } from '../contexts/AuthContext';

export function useAuth() {
  return useAuthContext();
}

export { AuthProvider };

