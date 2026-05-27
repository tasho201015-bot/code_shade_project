import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SellingProduct {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  category: string;
  stock: number;
}

let cache: SellingProduct[] | null = null;
const subs = new Set<(p: SellingProduct[]) => void>();

async function load() {
  const { data } = await supabase
    .from("products")
    .select("id,name,price,image_url,category,stock")
    .eq("is_active", true)
    .order("name");
  cache = (data ?? []) as SellingProduct[];
  subs.forEach((s) => s(cache!));
}

export function useProducts() {
  const [list, setList] = useState<SellingProduct[]>(cache ?? []);
  useEffect(() => {
    subs.add(setList);
    if (cache === null) load();
    return () => {
      subs.delete(setList);
    };
  }, []);
  return list;
}

export function productById(list: SellingProduct[], id: string) {
  return list.find((p) => p.id === id) ?? null;
}
