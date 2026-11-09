'use client';

// lib/auth-context.tsx
// Stav prihlásenia pre celú appku. Obal je v app/layout.tsx, stránky volajú useAuth().
//
//   const { user, loading } = useAuth();
//   loading = true, kým Firebase nezistí, či je niekto prihlásený (po načítaní stránky).
//   user = null, ak nikto prihlásený nie je.

import { onAuthStateChanged, type User } from 'firebase/auth';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { getClientAuth } from '@/lib/firebase-client';

interface AuthState {
  user: User | null;
  loading: boolean;
  // Po user.reload() (napr. overenie e-mailu) sa objekt User zmení na mieste a React
  // o tom nevie. refresh() vynúti nové vykreslenie so stavom z Firebase.
  refresh: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [, setVersion] = useState(0);

  useEffect(() => {
    try {
      return onAuthStateChanged(getClientAuth(), (u) => {
        setUser(u);
        setLoading(false);
      });
    } catch (e) {
      // Najčastejšie chýbajúce NEXT_PUBLIC_FIREBASE_* v .env.local. Stránka sa aspoň
      // vykreslí ako "neprihlásený" namiesto bielej obrazovky.
      console.error('Firebase Auth sa nepodarilo spustiť. Skontroluj .env.local.', e);
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(() => setVersion((v) => v + 1), []);

  return <AuthContext.Provider value={{ user, loading, refresh }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth() musí byť vnútri <AuthProvider>');
  return ctx;
}
