import * as React from "react";
import { cn } from "@/lib/utils";

export interface StatProps {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  className?: string;
  valueClassName?: string;
}

/**
 * Regla 4 del sistema visual: cifra en Instrument Serif grande,
 * label en Inter pequeño debajo.
 */
function Stat({ label, value, sub, className, valueClassName }: StatProps) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <div className={cn("stat-value", valueClassName)}>{value}</div>
      <div className="stat-label">{label}</div>
      {sub ? <div className="text-xs text-text-3">{sub}</div> : null}
    </div>
  );
}

export { Stat };
