import { useI18n } from "@/lib/i18n";

export function Footer() {
  const { t } = useI18n();
  return (
    <footer className="relative isolate text-cream bg-black" style={{ backgroundColor: "#000000" }}>
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-20 grid md:grid-cols-4 gap-12">
        <div>
          <div className="font-display text-3xl tracking-luxe uppercase">Mala<span className="italic font-light">z</span></div>
          <p className="mt-4 text-sm text-cream/60 leading-relaxed max-w-xs">
            {t("foot.tagline")}
          </p>
        </div>
        <div>
          <h4 className="text-xs uppercase tracking-luxe text-accent mb-4">{t("foot.shop")}</h4>
          <ul className="space-y-2 text-sm text-cream/70">
            <li>{t("col.abayas")}</li><li>{t("col.dresses")}</li><li>{t("col.blouses")}</li><li>{t("col.new")}</li>
          </ul>
        </div>
        <div>
          <h4 className="text-xs uppercase tracking-luxe text-accent mb-4">{t("foot.house")}</h4>
          <ul className="space-y-2 text-sm text-cream/70">
            <li>{t("foot.story")}</li><li>{t("foot.sustain")}</li><li>{t("foot.journal")}</li><li>{t("foot.press")}</li>
          </ul>
        </div>
        <div>
          <h4 className="text-xs uppercase tracking-luxe text-accent mb-4">{t("foot.care")}</h4>
          <ul className="space-y-2 text-sm text-cream/70">
            <li>{t("foot.contact")}</li><li>{t("foot.shipping")}</li><li>{t("foot.returns")}</li><li>Instagram @malaz.brand</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 py-6 text-center text-xs text-cream/50 tracking-luxe uppercase">
        © {new Date().getFullYear()} {t("foot.copyright")}
      </div>
    </footer>
  );
}
