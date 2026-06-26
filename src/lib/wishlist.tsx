import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

interface WishlistCtx {
  ids: Set<string>;
  loaded: boolean;
  count: number;
  has: (productId: string) => boolean;
  add: (productId: string) => Promise<{ ok: boolean; reason?: string }>;
  remove: (productId: string) => Promise<{ ok: boolean; reason?: string }>;
  toggle: (productId: string) => Promise<{ ok: boolean; added: boolean; reason?: string }>;
}

const Ctx = createContext<WishlistCtx | undefined>(undefined);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [ids, setIds] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    if (!user) {
      setIds(new Set());
      setLoaded(true);
      return;
    }
    setLoaded(false);
    supabase
      .from("wishlists")
      .select("product_id")
      .eq("user_id", user.id)
      .then(({ data }) => {
        if (!active) return;
        setIds(new Set((data ?? []).map((r) => r.product_id as string)));
        setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, [user]);

  const has = useCallback((pid: string) => ids.has(pid), [ids]);

  const add = useCallback<WishlistCtx["add"]>(async (pid) => {
    if (!user) return { ok: false, reason: "not_authenticated" };
    if (ids.has(pid)) return { ok: true };
    const prev = ids;
    const next = new Set(prev);
    next.add(pid);
    setIds(next);
    const { error } = await supabase.from("wishlists").insert({ user_id: user.id, product_id: pid });
    if (error && error.code !== "23505") {
      setIds(prev);
      return { ok: false, reason: error.message };
    }
    return { ok: true };
  }, [user, ids]);

  const remove = useCallback<WishlistCtx["remove"]>(async (pid) => {
    if (!user) return { ok: false, reason: "not_authenticated" };
    if (!ids.has(pid)) return { ok: true };
    const prev = ids;
    const next = new Set(prev);
    next.delete(pid);
    setIds(next);
    const { error } = await supabase
      .from("wishlists")
      .delete()
      .eq("user_id", user.id)
      .eq("product_id", pid);
    if (error) {
      setIds(prev);
      return { ok: false, reason: error.message };
    }
    return { ok: true };
  }, [user, ids]);

  const toggle = useCallback<WishlistCtx["toggle"]>(async (pid) => {
    if (ids.has(pid)) {
      const res = await remove(pid);
      return { ok: res.ok, added: false, reason: res.reason };
    }
    const res = await add(pid);
    return { ok: res.ok, added: true, reason: res.reason };
  }, [ids, add, remove]);

  return (
    <Ctx.Provider value={{ ids, loaded, count: ids.size, has, add, remove, toggle }}>
      {children}
    </Ctx.Provider>
  );
}

export function useWishlist() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useWishlist must be used within WishlistProvider");
  return ctx;
}
