"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
import { Profile } from "@/lib/types";
import { getProfile } from "@/lib/supabase/queries";

interface AuthContextValue {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  profile: null,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadProfile(userId: string) {
    const p = await getProfile(supabase, userId);
    setProfile(p);
  }

  async function refreshProfile() {
    if (user) await loadProfile(user.id);
  }

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const newUser = session?.user ?? null;
        setUser(newUser);

        if (!newUser) {
          setProfile(null);
          setLoading(false);
          return;
        }

        // 인증 상태가 확인되면 즉시 loading 해제 (UI 블로킹 방지)
        setLoading(false);

        // TOKEN_REFRESHED는 같은 유저가 유지되므로 profile 재조회 불필요
        // 불필요한 Supabase 호출을 줄여 auth token lock 경합 방지
        if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
          loadProfile(newUser.id).catch(() => {});
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
