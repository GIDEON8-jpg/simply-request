import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';

export type UserRole = 'preparer' | 'hod' | 'admin' | 'finance_manager' | 'hr' | 'accountant' | 'ceo' | 'technical_director';

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
  login: (username: string, password: string, role: UserRole, department?: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        if (session?.user) {
          const u = session.user;
          // Set a minimal user immediately to mark as authenticated
          setUser((prev) => prev ?? {
            id: u.id,
            username: u.email?.split('@')[0] || '',
            fullName: '',
            email: u.email || '',
            role: 'preparer',
            department: undefined,
          });
          // Defer profile loading to avoid deadlocks
          setTimeout(() => {
            loadUserProfile(u);
          }, 0);
        } else {
          setUser(null);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        const u = session.user;
        setUser((prev) => prev ?? {
          id: u.id,
          username: u.email?.split('@')[0] || '',
          fullName: '',
          email: u.email || '',
          role: 'preparer',
          department: undefined,
        });
        setTimeout(() => {
          loadUserProfile(u);
        }, 0);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadUserProfile = async (supabaseUser: SupabaseUser) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', supabaseUser.id)
        .single();

      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', supabaseUser.id);

      const userRole = roles?.[0]?.role as UserRole;

      if (profile) {
        const userData: User = {
          id: supabaseUser.id,
          username: profile.email?.split('@')[0] || '',
          fullName: profile.full_name || '',
          firstName: profile.full_name?.split(' ')[0] || '',
          email: profile.email || '',
          role: userRole,
          department: profile.department
        };
        setUser(userData);
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const login = async (username: string, password: string, role: UserRole, department?: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: username,
        password: password,
      });

      if (error) throw error;
      
      // Profile will be loaded automatically by onAuthStateChange
      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
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
