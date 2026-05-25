import { useI18n } from "@/lib/i18n";
import { motion, AnimatePresence } from "framer-motion";
import { Languages } from "lucide-react";

export function LanguageToggle() {
  const { lang, toggle } = useI18n();
  const label = lang === "en" ? "AR" : "EN";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={lang === "en" ? "Switch to Arabic" : "Switch to English"}
      className="relative inline-flex items-center gap-1.5 px-3 py-2 text-[11px] uppercase tracking-luxe hover:text-accent transition-colors"
    >
      <Languages className="w-4 h-4" />
      <span className="relative w-5 h-4 overflow-hidden inline-block">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={label}
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -10, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0 flex items-center justify-center font-medium"
          >
            {label}
          </motion.span>
        </AnimatePresence>
      </span>
    </button>
  );
}
