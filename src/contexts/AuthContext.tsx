import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  isDemo: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Local-first user for when Supabase is not available
const getLocalUser = (): User => {
  const stored = localStorage.getItem('local-user');
  if (stored) {
    return JSON.parse(stored);
  }
  
  const localUser = {
    id: 'local-user-' + Date.now(),
    email: 'local@student.com',
    created_at: new Date().toISOString(),
    app_metadata: {},
    user_metadata: { full_name: 'Local Student' },
    aud: 'authenticated',
    role: 'authenticated',
  } as User;
  
  localStorage.setItem('local-user', JSON.stringify(localUser));
  return localUser;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    // If Supabase is not available, use local-first mode
    if (!supabase) {
      setIsDemo(true);
      setUser(getLocalUser());
      setLoading(false);
      return;
    }

    // Otherwise, use Supabase auth
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string) => {
    if (isDemo || !supabase) {
      throw new Error('Authentication not available in local-first mode');
    }
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
  };

  const signIn = async (email: string, password: string) => {
    if (isDemo || !supabase) {
      throw new Error('Authentication not available in local-first mode');
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signOut = async () => {
    if (isDemo || !supabase) {
      setUser(null);
      localStorage.removeItem('local-user');
      // In local mode, recreate a new user on next load
      return;
    }
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signOut, isDemo }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
