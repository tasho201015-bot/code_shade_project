import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

type Role = "admin" | "customer";

interface AuthCtx {
  user: User | null;
  session: Session | null;
  loading: boolean;
  roles: Role[];
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let lastRolesUserId: string | null = null;

    const fetchRoles = (uid: string) => {
      if (lastRolesUserId === uid) return; // already cached for this user
      lastRolesUserId = uid;
      // defer to avoid deadlock with auth callback
      setTimeout(() => {
        supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", uid)
          .then(({ data }) => setRoles((data ?? []).map((r) => r.role as Role)));
      }, 0);
    };

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
      if (s?.user) {
        fetchRoles(s.user.id);
      } else {
        lastRolesUserId = null;
        setRoles([]);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const signIn: AuthCtx["signIn"] = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };
  const signUp: AuthCtx["signUp"] = async (email, password, fullName) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
      },
    });
    return { error: error?.message ?? null };
  };
  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <Ctx.Provider
      value={{
        user,
        session,
        loading,
        roles,
        isAdmin: roles.includes("admin"),
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
