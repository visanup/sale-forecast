import { type ReactNode } from 'react';
import { Navigate, useLocation, type Location } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

type RedirectIfAuthenticatedProps = {
  children: ReactNode;
};

export function RedirectIfAuthenticated({ children }: RedirectIfAuthenticatedProps) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();
  const state = location.state as { from?: Location } | undefined;

  if (loading) {
    return <>{children}</>;
  }

  if (isAuthenticated) {
    const destination = state?.from?.pathname ?? '/';
    return <Navigate to={destination} replace />;
  }

  return <>{children}</>;
}
