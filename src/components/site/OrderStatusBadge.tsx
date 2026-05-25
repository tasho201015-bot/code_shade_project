import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * Centralized colored status badge for the order lifecycle.
 * Statuses:
 *  - pending_confirmation        (yellow)   — COD placed, customer hasn't confirmed
 *  - paid_pending_confirmation   (blue)     — paid online, customer hasn't confirmed
 *  - confirmed_cod               (orange)   — COD confirmed, ready to ship
 *  - confirmed_paid              (green)    — paid + confirmed, ready to ship
 *  - shipped                     (purple)
 *  - delivered                   (dark green)
 *  - cancelled                   (red)
 */
export function statusLabel(raw: string | null | undefined): string {
  const s = (raw ?? "").toLowerCase();
  switch (s) {
    case "pending_confirmation":
      return "Awaiting confirmation";
    case "paid_pending_confirmation":
      return "Paid · awaiting confirmation";
    case "confirmed_cod":
      return "Confirmed (COD)";
    case "confirmed_paid":
      return "Confirmed (Paid)";
    case "shipped":
      return "Shipped";
    case "delivered":
      return "Delivered";
    case "cancelled":
      return "Cancelled";
    case "failed":
      return "Payment failed";
    default:
      return raw ?? "Unknown";
  }
}

const styles: Record<string, string> = {
  pending_confirmation:
    "bg-yellow-100 text-yellow-900 border-yellow-300 dark:bg-yellow-500/15 dark:text-yellow-200 dark:border-yellow-500/40",
  paid_pending_confirmation:
    "bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-500/15 dark:text-blue-200 dark:border-blue-500/40",
  confirmed_cod:
    "bg-orange-100 text-orange-900 border-orange-300 dark:bg-orange-500/15 dark:text-orange-200 dark:border-orange-500/40",
  confirmed_paid:
    "bg-green-100 text-green-900 border-green-300 dark:bg-green-500/15 dark:text-green-200 dark:border-green-500/40",
  shipped:
    "bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-500/15 dark:text-purple-200 dark:border-purple-500/40",
  delivered:
    "bg-emerald-200 text-emerald-950 border-emerald-400 dark:bg-emerald-600/25 dark:text-emerald-100 dark:border-emerald-500/50",
  cancelled:
    "bg-red-100 text-red-900 border-red-300 dark:bg-red-500/15 dark:text-red-200 dark:border-red-500/40",
  failed:
    "bg-red-100 text-red-900 border-red-300 dark:bg-red-500/15 dark:text-red-200 dark:border-red-500/40",
};

export function OrderStatusBadge({
  status,
  className,
}: {
  status: string | null | undefined;
  className?: string;
}) {
  const key = (status ?? "").toLowerCase();
  return (
    <Badge
      variant="outline"
      className={cn(
        "uppercase tracking-luxe text-[10px] border",
        styles[key] ?? "bg-muted text-foreground border-border",
        className,
      )}
    >
      {statusLabel(status)}
    </Badge>
  );
}

export const ORDER_STATUSES = [
  "pending_confirmation",
  "paid_pending_confirmation",
  "confirmed_cod",
  "confirmed_paid",
  "shipped",
  "delivered",
  "cancelled",
] as const;
