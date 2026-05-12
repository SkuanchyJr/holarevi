import { useEffect, useState } from "react";

interface CountdownProps {
  to: string;
  className?: string;
  labels?: { d: string; h: string; m: string; s: string };
  compact?: boolean;
}

function diff(targetMs: number, nowMs: number) {
  const total = Math.max(0, targetMs - nowMs);
  const days = Math.floor(total / (1000 * 60 * 60 * 24));
  const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((total / (1000 * 60)) % 60);
  const seconds = Math.floor((total / 1000) % 60);
  return { total, days, hours, minutes, seconds };
}

export function Countdown({ to, className, labels, compact }: CountdownProps) {
  const target = new Date(to).getTime();
  const [{ total, days, hours, minutes, seconds }, setTick] = useState(() => diff(target, Date.now()));

  useEffect(() => {
    const id = setInterval(() => setTick(diff(target, Date.now())), 1000);
    return () => clearInterval(id);
  }, [target]);

  if (total <= 0) return null;

  const L = labels ?? { d: "d", h: "h", m: "m", s: "s" };
  const pad = (n: number) => n.toString().padStart(2, "0");

  if (compact) {
    return (
      <span className={className} aria-live="polite">
        {days > 0 && <>{days}{L.d} </>}
        {pad(hours)}{L.h} {pad(minutes)}{L.m} {pad(seconds)}{L.s}
      </span>
    );
  }

  const Cell = ({ value, label }: { value: string; label: string }) => (
    <span className="inline-flex flex-col items-center leading-none">
      <span className="font-mono font-bold tabular-nums text-base sm:text-lg">{value}</span>
      <span className="text-[10px] uppercase tracking-wider opacity-70">{label}</span>
    </span>
  );

  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ""}`} aria-live="polite">
      {days > 0 && <Cell value={pad(days)} label={L.d} />}
      <Cell value={pad(hours)} label={L.h} />
      <Cell value={pad(minutes)} label={L.m} />
      <Cell value={pad(seconds)} label={L.s} />
    </span>
  );
}
