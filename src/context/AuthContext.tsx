import React, { createContext, useContext, useEffect, useState } from 'react';
import { AuthUser } from '../types';
import { loginWithEmail, loginWithGoogle, logoutUser, subscribeToAuthState, sendPasswordReset, updatePassword } from '../supabase/auth';
import { isSupabaseConfigured } from '../supabase/config';

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  isBackendLive: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribe = subscribeToAuthState((authUser) => {
      setUser(authUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const login = async (email: string, pass: string) => {
    const authUser = await loginWithEmail(email, pass);
    setUser(authUser);
  };

  const signInWithGoogle = async () => {
    await loginWithGoogle();
  };

  const setPassword = async (password: string) => {
    await updatePassword(password);
  };

  const logout = async () => {
    await logoutUser();
    setUser(null);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordReset(email);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, loginWithGoogle: signInWithGoogle, updatePassword: setPassword, logout, resetPassword, isBackendLive: isSupabaseConfigured }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
