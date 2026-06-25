import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listProductFaqs } from "@/lib/product-experience.functions";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useI18n } from "@/lib/i18n";

interface Faq {
  id: string;
  question: string;
  question_ar: string | null;
  answer: string;
  answer_ar: string | null;
}

export function ProductFAQ({ productId }: { productId: string }) {
  const { lang, t } = useI18n();
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [loading, setLoading] = useState(true);
  const list = useServerFn(listProductFaqs);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    list({ data: { productId } })
      .then((res) => { if (!cancelled) setFaqs(res.faqs as Faq[]); })
      .catch(() => { if (!cancelled) setFaqs([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [productId, list]);

  if (loading) return <div className="text-sm text-muted-foreground">…</div>;
  if (faqs.length === 0) return <div className="text-sm text-muted-foreground">{t("prod.faq.empty")}</div>;

  return (
    <Accordion type="single" collapsible className="w-full max-w-3xl">
      {faqs.map((f) => {
        const q = lang === "ar" && f.question_ar ? f.question_ar : f.question;
        const a = lang === "ar" && f.answer_ar ? f.answer_ar : f.answer;
        return (
          <AccordionItem key={f.id} value={f.id}>
            <AccordionTrigger className="text-sm md:text-[15px] text-left">{q}</AccordionTrigger>
            <AccordionContent className="text-sm md:text-[15px] text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {a}
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}
