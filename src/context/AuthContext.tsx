import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ApiError, apiRequest, SESSION_EXPIRED_EVENT, tokenStore } from '../services/apiClient';
import type { Role, User } from '../types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
  hasRole: (...roles: Role[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const clearSession = useCallback(() => {
    tokenStore.clear();
    setUser(null);
  }, []);

  // Q-F7: the API client raises an event instead of navigating; React handles the redirect.
  useEffect(() => {
    const onExpired = () => setUser(null);
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!tokenStore.getAccess() && !tokenStore.getRefresh()) {
        if (!cancelled) setIsLoading(false);
        return;
      }
      try {
        // apiRequest transparently refreshes on 401, so one call covers both paths.
        const me = await apiRequest<User>('/auth/me');
        if (!cancelled) setUser(me);
      } catch {
        if (!cancelled) clearSession();
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [clearSession]);

  const login = useCallback(async (identifier: string, password: string) => {
    const result = await apiRequest<{ accessToken: string; refreshToken: string; user: User }>(
      '/auth/login',
      { method: 'POST', body: { identifier, password }, anonymous: true },
    );
    tokenStore.set(result.accessToken, result.refreshToken);
    setUser(result.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiRequest('/auth/logout', {
        method: 'POST',
        body: { refreshToken: tokenStore.getRefresh() },
      });
    } catch {
      // Logging out locally matters more than the server acknowledging it.
    }
    clearSession();
  }, [clearSession]);

  const forgotPassword = useCallback(async (email: string) => {
    await apiRequest('/auth/forgot-password', { method: 'POST', body: { email }, anonymous: true });
  }, []);

  const resetPassword = useCallback(async (token: string, newPassword: string) => {
    await apiRequest('/auth/reset-password', {
      method: 'POST',
      body: { token, newPassword },
      anonymous: true,
    });
  }, []);

  const hasRole = useCallback(
    (...roles: Role[]) => (user ? roles.includes(user.role) : false),
    [user],
  );

  const value = useMemo(
    () => ({ user, isLoading, login, logout, forgotPassword, resetPassword, hasRole }),
    [user, isLoading, login, logout, forgotPassword, resetPassword, hasRole],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

export { ApiError };
