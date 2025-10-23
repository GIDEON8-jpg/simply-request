import React, { createContext, useContext, useState, useEffect } from 'react';

export type UserRole = 'hod' | 'admin' | 'finance' | 'hr' | 'accountant';

interface User {
  id: string;
  username: string;
  fullName: string;
  email: string;
  role: UserRole;
  department?: string;
  firstName?: string;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string, role: UserRole) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock users for demo
const MOCK_USERS = [
  { id: '1', username: 'hod1', password: 'password', fullName: 'John Smith', firstName: 'John', email: 'john@company.com', role: 'hod' as UserRole, department: 'Marketing' },
  { id: '2', username: 'admin1', password: 'password', fullName: 'Sarah Admin', firstName: 'Sarah', email: 'sarah@company.com', role: 'admin' as UserRole },
  { id: '2b', username: 'administrator', password: 'password', fullName: 'Admin User', firstName: 'Admin', email: 'admin@company.com', role: 'admin' as UserRole },
  { id: '3', username: 'finance1', password: 'password', fullName: 'Michael Finance', firstName: 'Michael', email: 'michael@company.com', role: 'finance' as UserRole },
  { id: '4', username: 'hr1', password: 'password', fullName: 'Emily HR', firstName: 'Emily', email: 'emily@company.com', role: 'hr' as UserRole },
  { id: '5', username: 'kenny', password: 'password', fullName: 'Kenny Accountant', firstName: 'Kenny', email: 'kenny@company.com', role: 'accountant' as UserRole },
];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const login = async (username: string, password: string, role: UserRole): Promise<boolean> => {
    const foundUser = MOCK_USERS.find(
      u => u.username === username && u.password === password && u.role === role
    );

    if (foundUser) {
      const { password: _, ...userWithoutPassword } = foundUser;
      setUser(userWithoutPassword);
      localStorage.setItem('user', JSON.stringify(userWithoutPassword));
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
