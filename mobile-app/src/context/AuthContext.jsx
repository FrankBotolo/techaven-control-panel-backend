import React, { createContext, useContext, useState, useEffect } from 'react';
import { getToken, setToken as persistToken } from '../api/client';
import { user as userApi } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUser = async () => {
    const token = await getToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const { data } = await userApi.getProfile();
      if (data?.success && data?.data) setUser(data.data);
      else setUser(null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUser();
  }, []);

  const signIn = (userData, accessToken) => {
    setUser(userData);
    if (accessToken) persistToken(accessToken);
  };

  const signOut = async () => {
    setUser(null);
    await persistToken(null);
  };

  const updateUser = (updates) => {
    setUser((u) => (u ? { ...u, ...updates } : null));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        signIn,
        signOut,
        updateUser,
        refreshUser: loadUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
