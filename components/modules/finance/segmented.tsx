"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: Array<SegmentedOption<T>>;
  className?: string;
  size?: "sm" | "default";
  "aria-label"?: string;
}

/**
 * Toggle segmentado (gasto/ingreso, fuente, dirección de deuda).
 * No existe en `@/components/ui`, así que vive dentro del módulo.
 */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
  size = "default",
  ...rest
}: SegmentedProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={rest["aria-label"]}
      className={cn(
        "inline-flex items-center gap-1 rounded-md border border-border bg-surface p-1",
        className
      )}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "rounded-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60",
              size === "sm" ? "px-2.5 py-1 text-[11px]" : "px-3 py-1.5 text-xs",
              active
                ? "bg-accent-soft text-accent"
                : "text-text-2 hover:bg-surface-2 hover:text-text"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
