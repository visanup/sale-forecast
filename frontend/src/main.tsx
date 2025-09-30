import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import './index.css';
import { AppLayout } from './ui/AppLayout';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { ProfilePage } from './pages/ProfilePage';
import { SettingsPage } from './pages/SettingsPage';
import { AdminImportPage } from './pages/AdminImportPage';
import { ApiPortalPage } from './pages/ApiPortalPage';
import { ApiKeysPage } from './pages/ApiKeysPage';

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'login', element: <LoginPage /> },
      { path: 'signup', element: <SignupPage /> },
      { path: 'profile', element: <ProfilePage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'admin/import', element: <AdminImportPage /> },
      { path: 'api', element: <ApiPortalPage /> },
      { path: 'api-keys', element: <ApiKeysPage /> },
      // Backward compatibility after merging pages: redirect old path
      { path: 'manual-entry', element: <Navigate to="/" replace /> }
    ]
  }
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);


