/**
 * Constantes y tipos compartidos del módulo Tareas.
 *
 * Archivo puro (sin JSX ni "use client"): lo importan tanto los componentes
 * como las API routes de `app/api/tasks`.
 */

// ─────────────────────────────────────────
// Estado
// ─────────────────────────────────────────

export const TASK_STATUSES = ["pending", "in_progress", "done"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

/** Estados que siguen "vivos": los únicos que aparecen en la matriz. */
export const OPEN_STATUSES: readonly TaskStatus[] = ["pending", "in_progress"];

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  pending: "Pendiente",
  in_progress: "En progreso",
  done: "Hecho",
};

/** Orden del stepper del modal: Pendiente → En progreso → Hecho. */
export const TASK_STATUS_STEPS: readonly TaskStatus[] = TASK_STATUSES;

// ─────────────────────────────────────────
// Matriz de Eisenhower
// ─────────────────────────────────────────

export const QUADRANTS = ["do", "schedule", "delegate", "eliminate"] as const;
export type QuadrantKey = (typeof QUADRANTS)[number];

/**
 * El cuadrante no se guarda: se deriva de los booleanos `urgent` e `important`.
 *
 *                  │ importante ✓   │ importante ✗
 *   ───────────────┼────────────────┼───────────────
 *   urgente ✓      │ Hacer ya       │ Delegar
 *   urgente ✗      │ Agendar        │ Eliminar
 */
export const QUADRANT_FLAGS: Record<
  QuadrantKey,
  { urgent: boolean; important: boolean }
> = {
  do: { urgent: true, important: true },
  schedule: { urgent: false, important: true },
  delegate: { urgent: true, important: false },
  eliminate: { urgent: false, important: false },
};

/** Booleanos → cuadrante. Inverso exacto de `QUADRANT_FLAGS`. */
export function quadrantOf(urgent: boolean, important: boolean): QuadrantKey {
  if (important) return urgent ? "do" : "schedule";
  return urgent ? "delegate" : "eliminate";
}

export function isQuadrantKey(value: unknown): value is QuadrantKey {
  return (
    typeof value === "string" && (QUADRANTS as readonly string[]).includes(value)
  );
}

export type QuadrantMeta = {
  key: QuadrantKey;
  title: string;
  hint: string;
  /** Color del acento, ya resuelto a la variable CSS del sistema de diseño. */
  cssVar: string;
  /** Clases de texto/fondo del token correspondiente. */
  dotClass: string;
  textClass: string;
};

export const QUADRANT_META: Record<QuadrantKey, QuadrantMeta> = {
  do: {
    key: "do",
    title: "Hacer ya",
    hint: "Urgente e importante",
    cssVar: "var(--color-red)",
    dotClass: "bg-red",
    textClass: "text-red",
  },
  schedule: {
    key: "schedule",
    title: "Agendar",
    hint: "Importante, no urgente",
    cssVar: "var(--color-accent)",
    dotClass: "bg-accent",
    textClass: "text-accent",
  },
  delegate: {
    key: "delegate",
    title: "Delegar",
    hint: "Urgente, no importante",
    cssVar: "var(--color-yellow)",
    dotClass: "bg-yellow",
    textClass: "text-yellow",
  },
  eliminate: {
    key: "eliminate",
    title: "Eliminar",
    hint: "Ni urgente ni importante",
    cssVar: "var(--color-border)",
    dotClass: "bg-border",
    textClass: "text-text-2",
  },
};

/** Orden visual de la cuadrícula: TL, TR, BL, BR. */
export const QUADRANT_GRID_ORDER: readonly QuadrantKey[] = [
  "do",
  "schedule",
  "delegate",
  "eliminate",
];

// ─────────────────────────────────────────
// Recurrencia
// ─────────────────────────────────────────

export const RECURRENCE_FREQUENCIES = ["daily", "weekly", "monthly"] as const;
export type RecurrenceFrequency = (typeof RECURRENCE_FREQUENCIES)[number];

export const RECURRENCE_LABELS: Record<RecurrenceFrequency, string> = {
  daily: "Diaria",
  weekly: "Semanal",
  monthly: "Mensual",
};

// ─────────────────────────────────────────
// DTOs que devuelve la API
// ─────────────────────────────────────────

export type TaskLabelDTO = {
  id: number;
  name: string;
  color: string | null;
};

/** Lo que devuelve `GET /api/tasks/labels`. */
export type TaskLabelWithCount = TaskLabelDTO & { taskCount: number };

export type RecurrenceDTO = {
  id: number;
  frequency: RecurrenceFrequency;
  intervalN: number;
  dayOfMonth: number | null;
  /** 'YYYY-MM-DD' o null. */
  endsOn: string | null;
};

export type TaskDTO = {
  id: number;
  title: string;
  description: string | null;
  urgent: boolean;
  important: boolean;
  status: TaskStatus;
  /** 'YYYY-MM-DD' o null. */
  date: string | null;
  /** 'HH:mm' o null. */
  time: string | null;
  quadrant: QuadrantKey;
  recurrence: RecurrenceDTO | null;
  calendarEventId: number | null;
  doneAt: string | null;
  createdAt: string;
  labels: TaskLabelDTO[];
};

/** Respuesta de `GET /api/tasks/matrix`. */
export type MatrixDTO = Record<QuadrantKey, TaskDTO[]>;

// ─────────────────────────────────────────
// Paleta sugerida para etiquetas nuevas
// ─────────────────────────────────────────

/** Solo tokens del sistema: el selector de color no inventa hex sueltos. */
export const LABEL_COLORS = [
  "accent",
  "green",
  "yellow",
  "red",
  "neutral",
] as const;
export type LabelColor = (typeof LABEL_COLORS)[number];

export const LABEL_COLOR_VAR: Record<LabelColor, string> = {
  accent: "var(--color-accent)",
  green: "var(--color-green)",
  yellow: "var(--color-yellow)",
  red: "var(--color-red)",
  neutral: "var(--color-text-2)",
};

export function labelColorVar(color: string | null | undefined): string {
  if (color && color in LABEL_COLOR_VAR) {
    return LABEL_COLOR_VAR[color as LabelColor];
  }
  return LABEL_COLOR_VAR.neutral;
}
