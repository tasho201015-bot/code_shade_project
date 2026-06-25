import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

interface Props {
  endsAt: string; // ISO
  label?: string;
  onExpire?: () => void;
}

function diff(target: number) {
  const ms = Math.max(0, target - Date.now());
  const s = Math.floor(ms / 1000);
  return {
    expired: ms === 0,
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
  };
}

export function SaleCountdown({ endsAt, label = "Offer ends in:", onExpire }: Props) {
  const target = new Date(endsAt).getTime();
  const [t, setT] = useState(() => diff(target));

  useEffect(() => {
    if (Number.isNaN(target)) return;
    const id = setInterval(() => {
      const next = diff(target);
      setT(next);
      if (next.expired) {
        clearInterval(id);
        onExpire?.();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [target, onExpire]);

  if (Number.isNaN(target) || t.expired) return null;

  const Cell = ({ v, l }: { v: number; l: string }) => (
    <div className="flex flex-col items-center min-w-[44px] px-2 py-1.5 bg-noir text-cream rounded-sm">
      <span className="text-base md:text-lg font-display leading-none tabular-nums">{String(v).padStart(2, "0")}</span>
      <span className="text-[9px] uppercase tracking-luxe opacity-70 mt-0.5">{l}</span>
    </div>
  );

  return (
    <div className="flex items-center gap-3 flex-wrap" role="timer" aria-live="polite">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-luxe text-muted-foreground">
        <Clock className="w-3.5 h-3.5" />
        <span>{label}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <Cell v={t.days} l="D" />
        <Cell v={t.hours} l="H" />
        <Cell v={t.minutes} l="M" />
        <Cell v={t.seconds} l="S" />
      </div>
    </div>
  );
}
