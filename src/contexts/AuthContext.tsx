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
const getLocalUserId = (forceNew = false) => {
  if (forceNew) {
    localStorage.removeItem('local-user-id');
  }
  const storedId = localStorage.getItem('local-user-id');
  if (storedId) return storedId;
  const newId =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? `local-user-${crypto.randomUUID()}`
      : `local-user-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  localStorage.setItem('local-user-id', newId);
  return newId;
};

const getLocalUser = (email?: string): User => {
  const stored = localStorage.getItem('local-user');
  if (stored) {
    const parsed = JSON.parse(stored);
    if (email && parsed.email !== email) {
      const updated = { ...parsed, email, id: getLocalUserId(true) };
      localStorage.setItem('local-user', JSON.stringify(updated));
      return updated;
    }
    return parsed;
  }
  
  const localUser = {
    id: getLocalUserId(),
    email: email || 'local@student.com',
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
      setUser(getLocalUser(email));
      return;
    }
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
  };

  const signIn = async (email: string, password: string) => {
    if (isDemo || !supabase) {
      setUser(getLocalUser(email));
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signOut = async () => {
    if (isDemo || !supabase) {
      setUser(null);
      localStorage.removeItem('local-user');
      localStorage.removeItem('local-user-id');
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
