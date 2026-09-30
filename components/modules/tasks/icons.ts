import {
  CalendarClock,
  Circle,
  CircleCheck,
  CircleDot,
  Trash2,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { QuadrantKey, TaskStatus } from "./constants";

/** Ícono de cada cuadrante — se usa en el selector visual y en las cabeceras. */
export const QUADRANT_ICONS: Record<QuadrantKey, LucideIcon> = {
  do: Zap,
  schedule: CalendarClock,
  delegate: Users,
  eliminate: Trash2,
};

/** Ícono del stepper de estado. */
export const STATUS_ICONS: Record<TaskStatus, LucideIcon> = {
  pending: Circle,
  in_progress: CircleDot,
  done: CircleCheck,
};
