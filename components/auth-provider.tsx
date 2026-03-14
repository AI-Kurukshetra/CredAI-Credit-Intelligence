"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import { AuthProfile, AuthState } from "@/lib/domain";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

interface AuthContextValue {
  profile: AuthProfile | null;
  accessToken: string | null;
  isLoading: boolean;
  refresh: () => Promise<AuthState>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function loadAuthState(): Promise<AuthState> {
  const supabase = createBrowserSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    return { profile: null, accessToken: null };
  }

  const response = await fetch("/api/auth/me", {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (!response.ok) {
    return {
      profile: null,
      accessToken: null,
    };
  }

  const profile = (await response.json()) as AuthProfile;

  return {
    profile,
    accessToken: session.access_token,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = async () => {
    setIsLoading(true);
    const state = await loadAuthState();
    setProfile(state.profile);
    setAccessToken(state.accessToken);
    setIsLoading(false);
    return state;
  };

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    queueMicrotask(() => {
      void refresh();
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void refresh();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    const supabase = createBrowserSupabaseClient();
    await supabase.auth.signOut();
    setProfile(null);
    setAccessToken(null);
  };

  return (
    <AuthContext.Provider
      value={{ profile, accessToken, isLoading, refresh, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }

  return context;
}
