import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { logAuditEvent } from '@/lib/audit-utils';

export type UserRole = 'preparer' | 'hod' | 'admin' | 'finance_manager' | 'deputy_finance_manager' | 'hr' | 'accountant' | 'ceo' | 'technical_director';

// Priority order for determining primary role when user has multiple roles
const ROLE_PRIORITY: UserRole[] = ['ceo', 'technical_director', 'finance_manager', 'deputy_finance_manager', 'hod', 'accountant', 'admin', 'hr', 'preparer'];

interface User {
  id: string;
  username: string;
  fullName: string;
  email: string;
  role: UserRole;
  roles: UserRole[];
  department?: string;
  firstName?: string;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string, role: UserRole, department?: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  isAuthReady: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

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
            role: 'preparer' as UserRole,
            roles: ['preparer' as UserRole],
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
          role: 'preparer' as UserRole,
          roles: ['preparer' as UserRole],
          department: undefined,
        });
        setTimeout(() => {
          loadUserProfile(u);
        }, 0);
      }
      setIsAuthReady(true);
    }).catch((error) => {
      console.error('Error restoring auth session:', error);
      setIsAuthReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadUserProfile = async (supabaseUser: SupabaseUser) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', supabaseUser.id)
        .maybeSingle();

      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', supabaseUser.id);

      const loadedRoles: UserRole[] = (roles || []).map(r => r.role as UserRole);
      const allRoles: UserRole[] = loadedRoles.length > 0 ? loadedRoles : ['preparer'];
      // Pick the highest-priority role as the primary
      const primaryRole: UserRole = ROLE_PRIORITY.find(r => allRoles.includes(r)) || allRoles[0] || 'preparer';

      const userData: User = {
        id: supabaseUser.id,
        username: profile?.email?.split('@')[0] || supabaseUser.email?.split('@')[0] || '',
        fullName: profile?.full_name || supabaseUser.user_metadata?.full_name || '',
        firstName: profile?.full_name?.split(' ')[0] || supabaseUser.user_metadata?.full_name?.split(' ')[0] || '',
        email: profile?.email || supabaseUser.email || '',
        role: primaryRole,
        roles: allRoles,
        department: profile?.department || supabaseUser.user_metadata?.department
      };
      setUser(userData);
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
      
      // Log login event - profile will be loaded by onAuthStateChange
      if (data.user) {
        setTimeout(async () => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', data.user.id)
            .single();
          
          await logAuditEvent({
            user_id: data.user.id,
            user_name: profile?.full_name || data.user.email || 'Unknown',
            action_type: 'login',
            details: `User logged in at ${new Date().toISOString()}`,
          });
        }, 100);
      }
      
      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const logout = async () => {
    // Log logout event before signing out
    if (user) {
      await logAuditEvent({
        user_id: user.id,
        user_name: user.fullName || user.email,
        action_type: 'logout',
        details: `User logged out at ${new Date().toISOString()}`,
      });
    }
    
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user, isAuthReady }}>
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
