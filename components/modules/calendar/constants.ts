/**
 * Constantes del módulo Calendario.
 *
 * Se importa tanto desde el cliente como desde las API routes, así que no
 * lleva `"use client"` ni depende de React.
 */

export const EVENT_CATEGORIES = ["medical", "work", "personal", "study"] as const;
export type EventCategory = (typeof EVENT_CATEGORIES)[number];

export const REMIND_TYPES = ["same_day", "day_before", "custom"] as const;
export type RemindType = (typeof REMIND_TYPES)[number];

export const RECURRENCE_FREQUENCIES = ["daily", "weekly", "monthly"] as const;
export type RecurrenceFrequency = (typeof RECURRENCE_FREQUENCIES)[number];

export interface CategoryMeta {
  value: EventCategory;
  label: string;
  icon: string;
  /** Clases de los tokens de diseño ya definidos en `globals.css`. */
  text: string;
  bg: string;
  border: string;
  /** Fondo sólido, para los puntos de la vista Mes. */
  dot: string;
}

export const CATEGORY_META: Record<EventCategory, CategoryMeta> = {
  medical: {
    value: "medical",
    label: "Médico",
    icon: "🏥",
    text: "text-cat-medical",
    bg: "bg-cat-medical/15",
    border: "border-cat-medical/40",
    dot: "bg-cat-medical",
  },
  work: {
    value: "work",
    label: "Trabajo",
    icon: "💼",
    text: "text-cat-work",
    bg: "bg-cat-work/15",
    border: "border-cat-work/40",
    dot: "bg-cat-work",
  },
  personal: {
    value: "personal",
    label: "Personal",
    icon: "👤",
    text: "text-cat-personal",
    bg: "bg-cat-personal/15",
    border: "border-cat-personal/40",
    dot: "bg-cat-personal",
  },
  study: {
    value: "study",
    label: "Estudio",
    icon: "📚",
    text: "text-cat-study",
    bg: "bg-cat-study/15",
    border: "border-cat-study/40",
    dot: "bg-cat-study",
  },
};

export const CATEGORY_LIST: CategoryMeta[] = EVENT_CATEGORIES.map((c) => CATEGORY_META[c]);

export function categoryMeta(value: string): CategoryMeta {
  return CATEGORY_META[value as EventCategory] ?? CATEGORY_META.personal;
}

export const FREQUENCY_LABEL: Record<RecurrenceFrequency, string> = {
  daily: "Diaria",
  weekly: "Semanal",
  monthly: "Mensual",
};

/** Atajos del spec para los recordatorios. */
export const REMINDER_PRESETS = [
  { key: "same_day_7", label: "Mismo día 7am", remindType: "same_day" as RemindType, remindTime: "07:00", daysBefore: 0 },
  { key: "day_before_9", label: "Día anterior 9am", remindType: "day_before" as RemindType, remindTime: "09:00", daysBefore: 1 },
];

export const REMIND_TYPE_LABEL: Record<RemindType, string> = {
  same_day: "Mismo día",
  day_before: "Día anterior",
  custom: "Personalizado",
};

/**
 * Tope de ocurrencias que se materializan al crear un evento recurrente.
 * Ver `app/api/calendar/_lib.ts` → `generateOccurrences`.
 */
export const RECURRENCE_MAX_YEARS = 2;
export const RECURRENCE_MAX_OCCURRENCES = 400;
