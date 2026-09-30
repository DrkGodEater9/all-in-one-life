import { cn } from "@/lib/utils";
import { VIABILITY_DOT_CLASS, VIABILITY_LABEL } from "./constants";
import type { ProjectViability } from "./types";

/**
 * Semáforo de viabilidad. En fase 1 `viability` siempre es null y el spec pide
 * ocultarlo, así que el componente no renderiza nada en ese caso.
 */
export function ViabilityDot({
  viability,
  withLabel = false,
  className,
}: {
  viability: ProjectViability | null | undefined;
  withLabel?: boolean;
  className?: string;
}) {
  if (!viability) return null;

  return (
    <span
      className={cn("inline-flex items-center gap-1.5", className)}
      title={VIABILITY_LABEL[viability]}
    >
      <span
        aria-hidden
        className={cn("h-2 w-2 shrink-0 rounded-full", VIABILITY_DOT_CLASS[viability])}
      />
      {withLabel ? (
        <span className="text-xs text-text-2">{VIABILITY_LABEL[viability]}</span>
      ) : (
        <span className="sr-only">{VIABILITY_LABEL[viability]}</span>
      )}
    </span>
  );
}
