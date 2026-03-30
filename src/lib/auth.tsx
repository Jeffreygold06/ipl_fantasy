import React, { createContext, useContext, useState, useEffect } from 'react';
import { db, User } from './db';

interface AuthContextType {
  user: User | null;
  login: (mobile: string, password?: string) => void;
  logout: () => void;
  refreshUser: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    db.seedDataIfNeeded();
    const initializeUser = () => {
      const storedUser = db.getLoggedInUser();
      if (storedUser) setUser(storedUser);
    };
    initializeUser();
  }, []);

  const login = (mobile: string, password?: string) => {
    const u = db.login(mobile, password);
    setUser(u);
  };

  const logout = () => {
    db.logout();
    setUser(null);
  };

  const refreshUser = () => {
    if (user) {
      const u = db.getUser(user.id);
      if (u) setUser(u);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};
