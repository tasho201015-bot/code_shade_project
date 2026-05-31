import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { Menu } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { SellingSidebar } from "@/components/selling/SellingSidebar";

export const Route = createFileRoute("/admin/sales-booster")({
  beforeLoad: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw redirect({ to: "/login", search: { redirect: "/admin/sales-booster" } });
    }
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: session.user.id,
      _role: "admin",
    });
    if (!isAdmin) {
      throw redirect({ to: "/" });
    }
  },
  component: SalesBoosterLayout,
});

function SalesBoosterLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const sidebarProps = {
    basePath: "/admin/sales-booster",
    title: "Sales Booster",
    subtitle: "Admin · Smart Selling",
    backHref: "/admin",
    backLabel: "← Back to admin",
  } as const;

  return (
    <div className="selling-shell">
      <div className="flex min-h-screen">
        <div className="hidden lg:block sticky top-0 h-screen">
          <SellingSidebar {...sidebarProps} />
        </div>

        <AnimatePresence>
          {mobileOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setMobileOpen(false)}
                className="fixed inset-0 bg-black/60 z-40 lg:hidden"
              />
              <motion.div
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "tween", duration: 0.22 }}
                className="fixed top-0 left-0 bottom-0 z-50 lg:hidden"
              >
                <SellingSidebar {...sidebarProps} onNavigate={() => setMobileOpen(false)} />
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <main className="flex-1 min-w-0">
          <header className="lg:hidden flex items-center justify-between px-4 py-3 border-b s-border">
            <button
              className="s-btn s-btn-ghost !p-2"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="font-semibold">Sales Booster</div>
            <div className="w-8" />
          </header>
          <div className="p-5 lg:p-8 max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
