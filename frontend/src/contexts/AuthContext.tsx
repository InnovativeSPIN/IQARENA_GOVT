/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { apiFetch } from '@/lib/api';

interface User {
  id: string;
  name: string;
  phone: string;
  role: 'ADMIN' | 'FACULTY' | 'STUDENT';
  email?: string | null;
  batch?: string | null;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  role: string | null;
  loginWithToken: (token: string, userData: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function decodeToken(token: string): User | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return {
      id: payload.userId,
      name: payload.name,
      phone: payload.phone,
      role: payload.role,
    };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      const decoded = decodeToken(token);
      if (decoded) {
        setUser(decoded);
        (async () => {
          try {
            const data = await apiFetch(`/profile/user/${decoded.id}`);
            if (data?.success && data.user) {
              setUser(prev => prev ? ({ ...prev, email: data.user.email, batch: data.user.batch || data.user.batchName || null }) : ({ ...decoded, email: data.user.email, batch: data.user.batch || data.user.batchName || null }));
            }
          } catch (err) {
            console.warn('Could not fetch full profile for user', err);
          }
        })();
      }
    }
  }, []);

  const loginWithToken = (token: string, userData: User) => {
    localStorage.setItem('token', token);
    setUser(userData);
    (async () => {
      try {
        const data = await apiFetch(`/profile/user/${userData.id}`);
        if (data?.success && data.user) {
          setUser(prev => prev ? ({ ...prev, email: data.user.email, batch: data.user.batch || data.user.batchName || null }) : ({ ...userData, email: data.user.email, batch: data.user.batch || data.user.batchName || null }));
        }
      } catch (err) {
        console.warn('Failed to fetch profile after login', err);
      }
    })();
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        role: user?.role || null,
        loginWithToken,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
