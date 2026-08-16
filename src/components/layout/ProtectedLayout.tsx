import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { AppLayout } from './AppLayout';
import { Spinner } from '../common/Spinner';
import type { Role } from '../../types';

/** Q-A9: renders AppLayout, which owns the Outlet. No children prop. */
export const ProtectedLayout: React.FC = () => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <Spinner label="Checking your session" fullPage />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <AppLayout />;
};

/** Q-F17: route-level role gate. Settings is admin-only. */
export const RequireRole: React.FC<{ roles: Role[]; children: React.ReactNode }> = ({
  roles,
  children,
}) => {
  const { user } = useAuth();
  if (!user || !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
};
