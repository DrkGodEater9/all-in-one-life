import type { BadgeProps } from "@/components/ui/badge";
import {
  PROJECT_STATUSES,
  type ProjectStatus,
  type ProjectViability,
} from "./types";

export { PROJECT_STATUSES, PROJECT_VIABILITIES } from "./types";

/** Orden de las columnas del kanban, tal como lo pide el spec. */
export const STATUS_COLUMNS: readonly ProjectStatus[] = PROJECT_STATUSES;

export const STATUS_LABEL: Record<ProjectStatus, string> = {
  idea: "Idea",
  en_progreso: "En progreso",
  pausado: "Pausado",
  descartado: "Descartado",
  completado: "Completado",
};

type BadgeVariant = NonNullable<BadgeProps["variant"]>;

export const STATUS_BADGE_VARIANT: Record<ProjectStatus, BadgeVariant> = {
  idea: "neutral",
  en_progreso: "default",
  pausado: "warning",
  descartado: "danger",
  completado: "success",
};

export const VIABILITY_LABEL: Record<ProjectViability, string> = {
  muy_viable: "Muy viable",
  viable: "Viable",
  poco_viable: "Poco viable",
};

/** Semáforo: verde / amarillo / rojo, con los tokens del sistema de diseño. */
export const VIABILITY_DOT_CLASS: Record<ProjectViability, string> = {
  muy_viable: "bg-green",
  viable: "bg-yellow",
  poco_viable: "bg-red",
};

export const VIABILITY_TEXT_CLASS: Record<ProjectViability, string> = {
  muy_viable: "text-green",
  viable: "text-yellow",
  poco_viable: "text-red",
};

export function isProjectStatus(value: string): value is ProjectStatus {
  return (PROJECT_STATUSES as readonly string[]).includes(value);
}

/** Valor centinela para los <Select> de filtro (Radix no admite value=""). */
export const ALL = "__all__";

/** Valor centinela para "sin categoría" en el select de categoría. */
export const NONE = "__none__";
