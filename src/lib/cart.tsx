import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CartItem {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  quantity: number;
  /** Live stock cap. When known, quantity is clamped to this. */
  stock?: number;
}

interface CartCtx {
  items: CartItem[];
  add: (item: Omit<CartItem, "quantity">, qty?: number) => { ok: boolean; reason?: string };
  remove: (id: string) => void;
  setQty: (id: string, qty: number) => { ok: boolean; reason?: string };
  clear: () => void;
  total: number;
  count: number;
  loaded: boolean;
}

const Ctx = createContext<CartCtx | undefined>(undefined);
const KEY = "malaz_cart_v1";

function sanitize(raw: unknown): CartItem[] {
  if (!Array.isArray(raw)) return [];
  const out: CartItem[] = [];
  for (const r of raw) {
    if (
      r &&
      typeof r === "object" &&
      typeof (r as any).id === "string" &&
      typeof (r as any).name === "string" &&
      typeof (r as any).price === "number" &&
      Number.isFinite((r as any).price) &&
      Number.isInteger((r as any).quantity) &&
      (r as any).quantity > 0
    ) {
      const it = r as any;
      out.push({
        id: it.id,
        name: it.name,
        price: it.price,
        image_url: typeof it.image_url === "string" ? it.image_url : null,
        quantity: it.quantity,
        stock: typeof it.stock === "number" ? it.stock : undefined,
      });
    }
  }
  return out;
}

function readInitial(): CartItem[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    return sanitize(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[] | null>(() => readInitial());
  const hydrated = useRef(items !== null);

  useEffect(() => {
    if (items !== null) return;
    setItems(readInitial() ?? []);
    hydrated.current = true;
  }, [items]);

  useEffect(() => {
    if (items === null || !hydrated.current) {
      if (items !== null) hydrated.current = true;
      return;
    }
    try {
      localStorage.setItem(KEY, JSON.stringify(items));
    } catch {
      // ignore
    }
  }, [items]);

  // Refresh live stock for any in-cart items on mount, so quantity caps stay honest.
  useEffect(() => {
    const list = items;
    if (!list || list.length === 0) return;
    const ids = list.map((i) => i.id);
    let alive = true;
    supabase
      .from("products")
      .select("id,stock,is_active")
      .in("id", ids)
      .then(({ data }) => {
        if (!alive || !data) return;
        const byId = new Map(data.map((d: any) => [d.id, d]));
        setItems((prev) =>
          (prev ?? []).flatMap((it) => {
            const live = byId.get(it.id);
            if (!live || live.is_active === false || (live.stock ?? 0) <= 0) {
              // out of stock or removed — drop it
              return [];
            }
            const qty = Math.min(it.quantity, live.stock);
            return [{ ...it, stock: live.stock, quantity: qty }];
          }),
        );
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const add: CartCtx["add"] = (item, qty = 1) => {
    let res: { ok: boolean; reason?: string } = { ok: true };
    setItems((prev) => {
      const list = prev ?? [];
      const cap = typeof item.stock === "number" ? item.stock : Infinity;
      if (cap <= 0) {
        res = { ok: false, reason: "Out of stock" };
        return list;
      }
      const found = list.find((p) => p.id === item.id);
      if (found) {
        const desired = found.quantity + qty;
        const next = Math.min(desired, cap);
        if (next === found.quantity) {
          res = { ok: false, reason: "Maximum available stock reached" };
          return list;
        }
        if (next < desired) res = { ok: true, reason: "Capped to available stock" };
        return list.map((p) => (p.id === item.id ? { ...p, stock: item.stock, quantity: next } : p));
      }
      const next = Math.min(qty, cap);
      return [...list, { ...item, quantity: next }];
    });
    return res;
  };

  const remove: CartCtx["remove"] = (id) => setItems((p) => (p ?? []).filter((i) => i.id !== id));

  const setQty: CartCtx["setQty"] = (id, qty) => {
    let res: { ok: boolean; reason?: string } = { ok: true };
    setItems((p) =>
      (p ?? []).map((i) => {
        if (i.id !== id) return i;
        const cap = typeof i.stock === "number" ? i.stock : Infinity;
        const next = Math.max(1, Math.min(qty, cap));
        if (next < qty) res = { ok: false, reason: "Capped to available stock" };
        return { ...i, quantity: next };
      }),
    );
    return res;
  };

  const clear = () => setItems([]);

  const safeItems = items ?? [];
  const total = safeItems.reduce((s, i) => s + i.price * i.quantity, 0);
  const count = safeItems.reduce((s, i) => s + i.quantity, 0);
  const loaded = items !== null;

  return (
    <Ctx.Provider value={{ items: safeItems, add, remove, setQty, clear, total, count, loaded }}>
      {children}
    </Ctx.Provider>
  );
}

export function useCart() {
  const ctx = useContext(Ctx);
  if (!ctx) {
    const noop = () => ({ ok: false, reason: "Cart not ready" });
    return {
      items: [] as CartItem[],
      add: noop,
      remove: () => {},
      setQty: noop,
      clear: () => {},
      total: 0,
      count: 0,
      loaded: false,
    } as unknown as CartCtx;
  }
  return ctx;
}
