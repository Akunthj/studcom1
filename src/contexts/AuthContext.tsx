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

const LEGACY_LOCAL_USER_KEY = 'local-user';
const LOCAL_USER_EMAIL_KEY = 'local-user-email';
const LOCAL_USER_ID_KEY = 'local-user-id';
const DEFAULT_LOCAL_EMAIL = 'local@student.com';

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const getLocalUserStorageKey = (email: string) => `local-user:${normalizeEmail(email)}`;

const generateLocalUserId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? `local-user-${crypto.randomUUID()}`
    : `local-user-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

const persistLocalUser = (user: User) => {
  localStorage.setItem(getLocalUserStorageKey(user.email ?? DEFAULT_LOCAL_EMAIL), JSON.stringify(user));
};

const setActiveLocalUser = (user: User) => {
  if (!user.email) return;
  localStorage.setItem(LOCAL_USER_EMAIL_KEY, normalizeEmail(user.email));
  localStorage.setItem(LOCAL_USER_ID_KEY, user.id);
};

const getLocalUser = (email?: string): User => {
  const fallbackEmail = normalizeEmail(
    email || localStorage.getItem(LOCAL_USER_EMAIL_KEY) || DEFAULT_LOCAL_EMAIL
  );
  const stored = localStorage.getItem(getLocalUserStorageKey(fallbackEmail));
  if (stored) {
    const parsed = JSON.parse(stored);
    setActiveLocalUser(parsed);
    return parsed;
  }

  const legacyStored = localStorage.getItem(LEGACY_LOCAL_USER_KEY);
  if (legacyStored) {
    const parsed = JSON.parse(legacyStored);
    const legacyEmail = normalizeEmail(parsed.email || fallbackEmail);
    const migrated = { ...parsed, email: legacyEmail, id: parsed.id || generateLocalUserId() };
    persistLocalUser(migrated);
    localStorage.removeItem(LEGACY_LOCAL_USER_KEY);
    setActiveLocalUser(migrated);
    return migrated;
  }

  const localUser = {
    id: generateLocalUserId(),
    email: fallbackEmail,
    created_at: new Date().toISOString(),
    app_metadata: {},
    user_metadata: { full_name: 'Local Student' },
    aud: 'authenticated',
    role: 'authenticated',
  } as User;

  persistLocalUser(localUser);
  setActiveLocalUser(localUser);
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
      localStorage.removeItem(LOCAL_USER_EMAIL_KEY);
      localStorage.removeItem(LOCAL_USER_ID_KEY);
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
