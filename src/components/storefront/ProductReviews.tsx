import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Star, ChevronLeft, ChevronRight, Send } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import {
  listProductReviews,
  submitProductReview,
} from "@/lib/reviews.functions";

interface Review {
  id: string;
  rating: number;
  title: string | null;
  title_ar: string | null;
  body: string;
  body_ar: string | null;
  lang: string;
  customer_name: string;
  customer_avatar_url: string | null;
  is_pinned: boolean;
  created_at: string;
}

function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <div className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          width={size}
          height={size}
          className={i <= Math.round(value) ? "fill-current text-[#D8B98A]" : "text-muted-foreground/40"}
        />
      ))}
    </div>
  );
}

export function ProductReviews({ productId }: { productId: string }) {
  const { lang, t } = useI18n();
  const { user } = useAuth();
  const list = useServerFn(listProductReviews);
  const submit = useServerFn(submitProductReview);

  const [reviews, setReviews] = useState<Review[]>([]);
  const [summary, setSummary] = useState({ count: 0, average: 0 });
  const [loading, setLoading] = useState(true);

  const trackRef = useRef<HTMLDivElement | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState("");
  const [title, setTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const refresh = () => {
    setLoading(true);
    list({ data: { productId } })
      .then((r) => {
        setReviews(r.reviews as Review[]);
        setSummary(r.summary);
      })
      .catch(() => {
        setReviews([]);
        setSummary({ count: 0, average: 0 });
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  const scroll = (dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLDivElement>("[data-review-card]");
    const step = card ? card.offsetWidth + 16 : el.clientWidth * 0.9;
    el.scrollBy({ left: step * dir * (lang === "ar" ? -1 : 1), behavior: "smooth" });
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error(t("reviews.loginRequired"));
      return;
    }
    if (rating < 1 || rating > 5) return;
    if (!body.trim()) {
      toast.error(t("reviews.bodyRequired"));
      return;
    }
    setSubmitting(true);
    try {
      await submit({
        data: {
          product_id: productId,
          rating,
          title: title.trim() || null,
          body: body.trim(),
          lang: lang === "ar" ? "ar" : "en",
          body_ar: lang === "ar" ? body.trim() : null,
          title_ar: lang === "ar" ? title.trim() || null : null,
        },
      });
      toast.success(t("reviews.submitted"));
      setShowForm(false);
      setBody("");
      setTitle("");
      setRating(5);
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setSubmitting(false);
    }
  };

  const visible = useMemo(() => reviews, [reviews]);

  return (
    <section className="mt-12 border border-border/70 rounded-sm px-6 py-7 md:px-8 md:py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-luxe text-accent">{t("reviews.eyebrow")}</div>
          <h2 className="font-display text-2xl md:text-3xl mt-1">{t("reviews.title")}</h2>
          <div className="mt-2 flex items-center gap-3">
            <Stars value={summary.average} size={16} />
            <span className="text-sm tabular-nums">
              {summary.average.toFixed(1)}
            </span>
            <span className="text-xs text-muted-foreground">
              {summary.count} {summary.count === 1 ? t("reviews.one") : t("reviews.many")}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => scroll(-1)}
            aria-label="Previous"
            className="w-9 h-9 border border-border rounded-sm hover:bg-muted inline-flex items-center justify-center"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => scroll(1)}
            aria-label="Next"
            className="w-9 h-9 border border-border rounded-sm hover:bg-muted inline-flex items-center justify-center"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setShowForm((s) => !s)}
            className="ml-2 px-4 py-2 text-[11px] uppercase tracking-luxe bg-noir text-cream hover:opacity-90"
          >
            {t("reviews.write")}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="mt-6 border border-border rounded-sm p-4 md:p-5 bg-muted/20">
          {!user ? (
            <div className="text-sm text-muted-foreground">{t("reviews.loginRequired")}</div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-[11px] uppercase tracking-luxe text-muted-foreground">
                  {t("reviews.rating")}
                </span>
                {[1, 2, 3, 4, 5].map((i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setRating(i)}
                    aria-label={`${i} stars`}
                    className="p-0.5"
                  >
                    <Star
                      className={`w-5 h-5 ${i <= rating ? "fill-current text-[#D8B98A]" : "text-muted-foreground/40"}`}
                    />
                  </button>
                ))}
              </div>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t("reviews.titlePlaceholder")}
                className="w-full px-3 py-2 text-sm border border-border bg-background"
                maxLength={200}
              />
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={t("reviews.bodyPlaceholder")}
                rows={4}
                maxLength={4000}
                className="w-full px-3 py-2 text-sm border border-border bg-background"
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-4 py-2 text-[11px] uppercase tracking-luxe bg-noir text-cream hover:opacity-90 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  {submitting ? "…" : t("reviews.submit")}
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground">{t("reviews.purchaseOnly")}</p>
            </div>
          )}
        </div>
      )}

      <div className="mt-6">
        {loading ? (
          <div className="text-sm text-muted-foreground">…</div>
        ) : visible.length === 0 ? (
          <div className="text-sm text-muted-foreground">{t("reviews.empty")}</div>
        ) : (
          <div
            ref={trackRef}
            dir={lang === "ar" ? "rtl" : "ltr"}
            className="flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory scrollbar-none pb-2 -mx-2 px-2"
          >
            {visible.map((r) => {
              const showAr = lang === "ar";
              const ttl = (showAr && r.title_ar) || r.title || "";
              const bdy = (showAr && r.body_ar) || r.body;
              return (
                <article
                  key={r.id}
                  data-review-card
                  className="snap-start shrink-0 w-[85%] sm:w-[60%] md:w-[42%] lg:w-[31%] border border-border rounded-sm p-5 bg-background"
                >
                  <div className="flex items-center gap-3">
                    {r.customer_avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={r.customer_avatar_url}
                        alt={r.customer_name}
                        className="w-10 h-10 rounded-full object-cover border border-border"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-muted text-foreground flex items-center justify-center text-sm font-medium uppercase">
                        {r.customer_name?.[0] ?? "?"}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{r.customer_name}</div>
                      <Stars value={r.rating} />
                    </div>
                  </div>
                  {ttl && (
                    <div className="mt-3 text-sm font-medium line-clamp-2">{ttl}</div>
                  )}
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed line-clamp-6 whitespace-pre-wrap">
                    {bdy}
                  </p>
                  <div className="mt-3 text-[10px] uppercase tracking-luxe text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString(lang === "ar" ? "ar-EG" : undefined)}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
