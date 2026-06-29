import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '@/types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isGuest: boolean;
  login: (email: string) => Promise<void>;
  logout: () => void;
  loginAsGuest: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Legacy 3-role values may still be in localStorage from older sessions.
function normalizeRole(role: string | undefined): UserRole {
  if (role === 'admin') return 'super_admin';
  if (role === 'super_admin' || role === 'client_admin' || role === 'finance' || role === 'hr' || role === 'employee') {
    return role;
  }
  return 'employee';
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize from localStorage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('app_user');
    const storedIsGuest = localStorage.getItem('app_is_guest');

    if (storedUser) {
      const parsed = JSON.parse(storedUser);
      parsed.role = normalizeRole(parsed.role);
      parsed.tenantId = parsed.tenantId ?? null;
      parsed.clientId = parsed.clientId ?? null;
      setUser(parsed);
    }
    if (storedIsGuest === 'true') {
      setIsGuest(true);
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string) => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500));

      const newUser: User = {
        id: `user-${Date.now()}`,
        email,
        name: email.split('@')[0],
        role: 'super_admin',
        tenantId: 'tnt-operator',
        clientId: null,
        company: 'PayrollPlatform',
        createdAt: new Date(),
        isGuest: false,
      };

      setUser(newUser);
      setIsGuest(false);
      localStorage.setItem('app_user', JSON.stringify(newUser));
      localStorage.setItem('app_is_guest', 'false');
    } finally {
      setIsLoading(false);
    }
  };

  const loginAsGuest = () => {
    setIsLoading(true);
    try {
      const guestUser: User = {
        id: `guest-${Date.now()}`,
        email: 'guest@demo.example',
        name: 'Guest User',
        role: 'employee',
        tenantId: 'tnt-operator',
        clientId: null,
        company: 'PayrollPlatform',
        createdAt: new Date(),
        isGuest: true,
      };

      setUser(guestUser);
      setIsGuest(true);
      localStorage.setItem('app_user', JSON.stringify(guestUser));
      localStorage.setItem('app_is_guest', 'true');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setIsGuest(false);
    localStorage.removeItem('app_user');
    localStorage.removeItem('app_is_guest');
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isGuest,
    login,
    logout,
    loginAsGuest,
    isLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
