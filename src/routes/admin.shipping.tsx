import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  fetchShippingSettings,
  fetchShippingRates,
  type ShippingSettings,
  type ShippingRate,
  type ShippingMode,
} from "@/lib/shipping";

// Match the governorate list used in checkout
const GOVERNORATES = [
  "Alexandria","Aswan","Asyut","Beheira","Beni Suef","Cairo","Dakahlia","Damietta","Fayoum",
  "Gharbia","Giza","Ismailia","Kafr El Sheikh","Luxor","Matrouh","Menofia","Minya","New Valley",
  "North Sinai","Port Said","Qaliubiya","Qena","Red Sea","Sharqia","Sohag","South Sinai","Suez",
];

export const Route = createFileRoute("/admin/shipping")({
  beforeLoad: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw redirect({ to: "/login", search: { redirect: "/admin/shipping" } });
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: session.user.id,
      _role: "admin",
    });
    if (!isAdmin) throw redirect({ to: "/" });
  },
  component: ShippingAdminPage,
});

function ShippingAdminPage() {
  const [settings, setSettings] = useState<ShippingSettings | null>(null);
  const [rates, setRates] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const [s, r] = await Promise.all([fetchShippingSettings(), fetchShippingRates()]);
      setSettings(s);
      const map: Record<string, number> = {};
      for (const g of GOVERNORATES) map[g] = 0;
      for (const row of r) map[row.governorate] = row.fee;
      setRates(map);
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const { error: e1 } = await supabase
        .from("shipping_settings")
        .update({
          mode: settings.mode,
          flat_fee: settings.flat_fee,
          free_shipping_threshold: settings.free_shipping_threshold,
        })
        .eq("id", true);
      if (e1) throw e1;

      if (settings.mode === "per_governorate") {
        const rows = GOVERNORATES.map((g) => ({
          governorate: g,
          fee: Number(rates[g]) || 0,
        }));
        const { error: e2 } = await supabase
          .from("shipping_rates")
          .upsert(rows, { onConflict: "governorate" });
        if (e2) throw e2;
      }
      toast.success("Shipping settings saved");
    } catch (e: any) {
      toast.error(e?.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !settings) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }

  const setMode = (mode: ShippingMode) => setSettings({ ...settings, mode });

  return (
    <div className="admin-shell bg-background min-h-screen text-foreground">
      <Header />
      <div className="pt-32 pb-32 max-w-4xl mx-auto px-6 lg:px-10">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="text-[10px] uppercase tracking-luxe text-accent">Atelier</div>
            <h1 className="font-display text-4xl md:text-5xl mt-2">Shipping settings</h1>
          </div>
          <Link to="/admin" className="text-xs uppercase tracking-luxe link-underline">
            ← Back to admin
          </Link>
        </div>

        {/* Mode */}
        <section className="mt-10 border border-border rounded-lg p-6">
          <h2 className="font-display text-2xl">Shipping fee mode</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Choose one fixed fee for every governorate or set a custom fee per governorate.
          </p>
          <div className="mt-5 grid sm:grid-cols-2 gap-3">
            <ModeOption
              active={settings.mode === "flat"}
              title="Flat fee"
              desc="One shipping fee applied to every governorate."
              onClick={() => setMode("flat")}
            />
            <ModeOption
              active={settings.mode === "per_governorate"}
              title="Per governorate"
              desc="Set a custom fee for each governorate individually."
              onClick={() => setMode("per_governorate")}
            />
          </div>
        </section>

        {/* Fees */}
        <section className="mt-6 border border-border rounded-lg p-6">
          <h2 className="font-display text-2xl">Fees</h2>

          {settings.mode === "flat" ? (
            <div className="mt-4 max-w-sm">
              <Label>Flat shipping fee (EGP)</Label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={settings.flat_fee}
                onChange={(e) =>
                  setSettings({ ...settings, flat_fee: Number(e.target.value) || 0 })
                }
                className="form-control tabular-nums w-full"
              />
            </div>
          ) : (
            <>
              <div className="mt-4 max-w-sm">
                <Label>Fallback flat fee (used if a governorate has no rate)</Label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={settings.flat_fee}
                  onChange={(e) =>
                    setSettings({ ...settings, flat_fee: Number(e.target.value) || 0 })
                  }
                  className="form-control tabular-nums w-full"
                />
              </div>
              <div className="mt-6 grid sm:grid-cols-2 gap-3">
                {GOVERNORATES.map((g) => (
                  <div key={g} className="flex items-center gap-3">
                    <span className="text-sm flex-1 min-w-0 truncate">{g}</span>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={rates[g] ?? 0}
                      onChange={(e) =>
                        setRates({ ...rates, [g]: Number(e.target.value) || 0 })
                      }
                      className="form-control tabular-nums w-32 text-right"
                    />
                    <span className="text-[10px] uppercase tracking-luxe text-muted-foreground">EGP</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>

        {/* Free shipping threshold */}
        <section className="mt-6 border border-border rounded-lg p-6">
          <h2 className="font-display text-2xl">Free shipping threshold</h2>
          <p className="text-xs text-muted-foreground mt-1">
            When the cart subtotal reaches this amount, shipping becomes free automatically.
            Set to 0 to disable.
          </p>
          <div className="mt-4 max-w-sm">
            <Label>Threshold (EGP)</Label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={settings.free_shipping_threshold}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  free_shipping_threshold: Number(e.target.value) || 0,
                })
              }
              className="form-control tabular-nums w-full"
            />
          </div>
        </section>

        <div className="mt-8 flex justify-end">
          <button
            onClick={save}
            disabled={saving}
            className="btn-glow bg-noir text-cream px-8 py-3 text-xs uppercase tracking-luxe disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
      <Footer />
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="block text-[10px] uppercase tracking-luxe text-muted-foreground mb-1">
      {children}
    </span>
  );
}

function ModeOption({
  active,
  title,
  desc,
  onClick,
}: {
  active: boolean;
  title: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left border p-4 rounded-md transition-colors ${
        active ? "border-accent bg-accent/5" : "border-border hover:border-foreground/40"
      }`}
    >
      <div className="flex items-center gap-3">
        <span
          className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
            active ? "border-accent" : "border-border"
          }`}
        >
          {active && <span className="w-2 h-2 rounded-full bg-accent" />}
        </span>
        <span className="text-sm font-medium">{title}</span>
      </div>
      <p className="text-xs text-muted-foreground mt-2">{desc}</p>
    </button>
  );
}
