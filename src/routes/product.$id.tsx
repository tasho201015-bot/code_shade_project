import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/lib/cart";
import { resolveImage } from "@/lib/product-image";
import { toast } from "sonner";

export const Route = createFileRoute("/product/$id")({
  component: ProductPage,
});

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  category: string;
  stock: number;
}

function ProductPage() {
  const { id } = Route.useParams();
  const [p, setP] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const { add, loaded: cartLoaded } = useCart();
  const nav = useNavigate();
  const [added, setAdded] = useState(false);

  useEffect(() => {
    supabase.from("products").select("*").eq("id", id).maybeSingle().then(({ data }) => {
      setP(data as Product | null);
      setLoading(false);
    });
  }, [id]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  if (!p) return <div className="min-h-screen flex items-center justify-center">Not found.</div>;

  const soldOut = (p.stock ?? 0) <= 0;

  const handleAdd = () => {
    if (soldOut) return;
    const res = add(
      { id: p.id, name: p.name, price: Number(p.price), image_url: p.image_url, stock: p.stock },
    );
    if (!res.ok) {
      toast.error(res.reason ?? "Could not add to bag");
      return;
    }
    if (res.reason) toast.message(res.reason);
    setAdded(true);
    setTimeout(() => setAdded(false), 1600);
  };

  return (
    <div className="bg-background min-h-screen">
      <Header />
      <div className="pt-28 max-w-7xl mx-auto px-6 lg:px-10 grid lg:grid-cols-2 gap-10 lg:gap-20 pb-32">
        <motion.div
          initial={{ opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
          className="aspect-[3/4] bg-muted shadow-luxe overflow-hidden"
        >
          <img src={resolveImage(p.image_url)} alt={p.name} className="w-full h-full object-cover" />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.2 }}
          className="lg:pt-10"
        >
          <div className="text-[10px] uppercase tracking-luxe text-accent">{p.category}</div>
          <h1 className="font-display text-4xl md:text-5xl mt-3 leading-tight">{p.name}</h1>
          <div className="mt-4 text-2xl tabular-nums">${Number(p.price).toFixed(2)}</div>
          <p className="mt-8 text-muted-foreground leading-relaxed max-w-md">{p.description}</p>

          <div className="mt-10 flex flex-col gap-3">
            <button
              onClick={handleAdd}
              disabled={!cartLoaded || soldOut}
              className="btn-glow bg-noir text-cream px-8 py-4 text-xs uppercase tracking-luxe disabled:opacity-60"
            >
              {soldOut ? "Sold out" : added ? "Added to bag ✓" : "Add to bag"}
            </button>
            <button
              onClick={() => { handleAdd(); nav({ to: "/cart" }); }}
              disabled={!cartLoaded || soldOut}
              className="px-8 py-4 text-xs uppercase tracking-luxe border border-border hover:border-accent transition-colors disabled:opacity-60"
            >
              Buy now
            </button>
          </div>

          <div className="mt-12 grid grid-cols-3 gap-6 text-[10px] uppercase tracking-luxe text-muted-foreground">
            <div>Free shipping<br/>over $200</div>
            <div>Easy returns<br/>14 days</div>
            <div>Secure<br/>checkout</div>
          </div>
        </motion.div>
      </div>
      <Footer />
    </div>
  );
}
