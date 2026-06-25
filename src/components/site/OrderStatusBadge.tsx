import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import {
  CANONICAL_ORDER_STATUSES,
  canonicalStatusLabel,
  normalizeOrderStatus,
  type CanonicalOrderStatus,
} from "@/lib/order-status";

/**
 * Returns the canonical dashboard label for any raw DB status.
 * Raw statuses (pending_confirmation, paid_pending_confirmation, ...) are
 * normalized so the admin UI never displays internal lifecycle strings.
 */
export function statusLabel(raw: string | null | undefined): string {
  return canonicalStatusLabel(normalizeOrderStatus(raw));
}

const styles: Record<CanonicalOrderStatus, string> = {
  pending:
    "bg-yellow-100 text-yellow-900 border-yellow-300 dark:bg-yellow-500/15 dark:text-yellow-200 dark:border-yellow-500/40",
  confirmed:
    "bg-green-100 text-green-900 border-green-300 dark:bg-green-500/15 dark:text-green-200 dark:border-green-500/40",
  shipped:
    "bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-500/15 dark:text-purple-200 dark:border-purple-500/40",
  delivered:
    "bg-emerald-200 text-emerald-950 border-emerald-400 dark:bg-emerald-600/25 dark:text-emerald-100 dark:border-emerald-500/50",
  returned:
    "bg-orange-100 text-orange-900 border-orange-300 dark:bg-orange-500/15 dark:text-orange-200 dark:border-orange-500/40",
  cancelled:
    "bg-red-100 text-red-900 border-red-300 dark:bg-red-500/15 dark:text-red-200 dark:border-red-500/40",
};

export function OrderStatusBadge({
  status,
  className,
}: {
  status: string | null | undefined;
  className?: string;
}) {
  const { t } = useI18n();
  const canonical = normalizeOrderStatus(status);
  const i18nKey = `status.${canonical}`;
  const translated = t(i18nKey);
  const label =
    translated && translated !== i18nKey ? translated : canonicalStatusLabel(canonical);
  return (
    <Badge
      variant="outline"
      className={cn(
        "uppercase tracking-luxe text-[10px] border",
        styles[canonical],
        className,
      )}
    >
      {label}
    </Badge>
  );
}

/**
 * Canonical dashboard statuses — the only options exposed to admins when
 * manually updating an order. Raw DB-only lifecycle statuses are preserved
 * server-side but never shown in the picker.
 */
export const ORDER_STATUSES = CANONICAL_ORDER_STATUSES;
