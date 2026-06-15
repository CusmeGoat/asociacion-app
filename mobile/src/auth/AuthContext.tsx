import React, {createContext, useContext, useEffect, useMemo, useState} from 'react';

import {apiClient} from '../api/ApiClient';
import {User} from '../types';

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  isSecretary: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (input: Record<string, string>) => Promise<void>;
  logout: () => Promise<void>;
  reloadMe: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({children}: {children: React.ReactNode}) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const reloadMe = async () => {
    const me = await apiClient.request<User>('/auth/me');
    setUser(me);
  };

  useEffect(() => {
    reloadMe()
      .catch(() => apiClient.clearTokens())
      .finally(() => setLoading(false));
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      isSecretary: user?.roles.includes('SECRETARIO') ?? false,
      login: async (email, password) => {
        const data = await apiClient.request<{
          access_token: string;
          refresh_token: string;
          user: User;
        }>('/auth/login', {
          method: 'POST',
          auth: false,
          body: JSON.stringify({email, password}),
        });
        await apiClient.saveTokens(data.access_token, data.refresh_token);
        setUser(data.user);
      },
      register: async input => {
        await apiClient.request('/users/', {
          method: 'POST',
          auth: false,
          body: JSON.stringify(input),
        });
      },
      logout: async () => {
        const refreshToken = await apiClient.getRefreshToken();
        if (refreshToken) {
          await apiClient.request('/auth/logout', {
            method: 'POST',
            auth: false,
            body: JSON.stringify({refresh_token: refreshToken}),
          }).catch(() => undefined);
        }
        await apiClient.clearTokens();
        setUser(null);
      },
      reloadMe,
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
}
