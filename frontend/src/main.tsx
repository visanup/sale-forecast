import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import './index.css';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './hooks/useAuth';
import { ErrorLogProvider } from './hooks/useErrorLog';
import { RequireAuth } from './components/RequireAuth';
import { RedirectIfAuthenticated } from './components/RedirectIfAuthenticated';
import { AppLayout } from './ui/AppLayout';
import { MODULE_CONFIG, MODULE_LIST } from './constants/modules';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { ProfilePage } from './pages/ProfilePage';
import { SettingsPage } from './pages/SettingsPage';
import { AdminImportPage } from './pages/AdminImportPage';
import { AdminUsersPage } from './pages/AdminUsersPage';
import { ApiPortalPage } from './pages/ApiPortalPage';
import { ApiKeysPage } from './pages/ApiKeysPage';
import { LogsPage } from './pages/LogsPage';
import { GuidePage } from './pages/GuidePage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { MonthlyAccessPage } from './pages/MonthlyAccessPage';
import { ForcePasswordChangePage } from './pages/ForcePasswordChangePage';

const protectedModuleRoutes = MODULE_LIST.filter((module) => module.isAvailable).map((module) => {
  const config = MODULE_CONFIG[module.id];
  return {
    path: config.basePath,
    element: (
      <RequireAuth>
        <AppLayout module={module.id} />
      </RequireAuth>
    ),
    children: createProtectedChildren(config.basePath)
  };
});

const router = createBrowserRouter([
  ...protectedModuleRoutes,
  {
    path: '/force-password-change',
    element: (
      <RequireAuth allowPasswordChange>
        <ForcePasswordChangePage />
      </RequireAuth>
    )
  },
  {
    path: '/login',
    element: (
      <RedirectIfAuthenticated>
        <LoginPage />
      </RedirectIfAuthenticated>
    )
  },
  {
    path: '/forgot-password',
    element: <ForgotPasswordPage />
  },
  {
    path: '/signup',
    element: (
      <RedirectIfAuthenticated>
        <SignupPage />
      </RedirectIfAuthenticated>
    )
  }
]);

function createProtectedChildren(homePath: string) {
  return [
    { index: true, element: <HomePage /> },
    { path: 'profile', element: <ProfilePage /> },
    { path: 'settings', element: <SettingsPage /> },
    { path: 'admin/import', element: <AdminImportPage /> },
    { path: 'api', element: <ApiPortalPage /> },
    { path: 'api-keys', element: <ApiKeysPage /> },
    { path: 'logs', element: <LogsPage /> },
    { path: 'guide', element: <GuidePage /> },
    { path: 'admin/users', element: <AdminUsersPage /> },
    { path: 'admin/monthly-access', element: <MonthlyAccessPage /> },
    { path: 'manual-entry', element: <Navigate to={homePath} replace /> }
  ];
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <ErrorLogProvider>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </ErrorLogProvider>
    </ThemeProvider>
  </React.StrictMode>
);
