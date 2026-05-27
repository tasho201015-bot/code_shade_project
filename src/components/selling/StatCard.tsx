import { type LucideIcon } from "lucide-react";
import { motion } from "framer-motion";

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="s-card p-5"
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wider s-muted">
          {label}
        </span>
        <Icon className="w-4 h-4 s-accent" />
      </div>
      <div className="text-2xl font-semibold mt-3 tabular-nums">{value}</div>
      {hint && <div className="text-xs s-muted mt-1">{hint}</div>}
    </motion.div>
  );
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  icon: Icon,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  icon: LucideIcon;
}) {
  return (
    <div className="s-card p-12 text-center">
      <div className="inline-flex w-12 h-12 rounded-full s-surface-2 items-center justify-center mb-4">
        <Icon className="w-5 h-5 s-accent" />
      </div>
      <div className="text-lg font-medium">{title}</div>
      <div className="text-sm s-muted mt-1 max-w-md mx-auto">{description}</div>
      {actionLabel && onAction && (
        <button onClick={onAction} className="s-btn s-btn-primary mt-5">
          {actionLabel}
        </button>
      )}
    </div>
  );
}
