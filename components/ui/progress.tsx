"use client";

import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import { cn } from "@/lib/utils";

export interface ProgressProps
  extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> {
  /** 0-100 */
  value?: number | null;
  /** Clase para teñir la barra (macros, deudas, semáforo de proyectos). */
  indicatorClassName?: string;
}

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  ProgressProps
>(({ className, value, indicatorClassName, ...props }, ref) => {
  const pct = Math.min(100, Math.max(0, Number(value ?? 0)));
  return (
    <ProgressPrimitive.Root
      ref={ref}
      value={pct}
      className={cn(
        "relative h-2 w-full overflow-hidden rounded-full bg-surface-2",
        className
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className={cn(
          "h-full w-full flex-1 rounded-full bg-accent transition-transform duration-150 ease-out",
          indicatorClassName
        )}
        style={{ transform: `translateX(-${100 - pct}%)` }}
      />
    </ProgressPrimitive.Root>
  );
});
Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress };
