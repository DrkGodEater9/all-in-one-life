/**
 * Helpers compartidos por las rutas de `/api/calendar` y `/api/cron/reminders`.
 *
 * No es una route: Next solo trata como endpoint los archivos `route.ts`.
 */
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { badRequest } from "@/lib/http";
import { parseDateKey, parseTime } from "@/lib/utils";
import {
  EVENT_CATEGORIES,
  RECURRENCE_FREQUENCIES,
  RECURRENCE_MAX_OCCURRENCES,
  RECURRENCE_MAX_YEARS,
  REMIND_TYPES,
  type RecurrenceFrequency,
} from "@/components/modules/calendar/constants";

// ─────────────────────────────────────────
// Esquemas reutilizables
// ─────────────────────────────────────────

export const dateKeySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido, se espera YYYY-MM-DD");

export const timeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Formato de hora inválido, se espera HH:mm");

export const categorySchema = z.enum(EVENT_CATEGORIES);

export const recurrenceSchema = z.object({
  frequency: z.enum(RECURRENCE_FREQUENCIES),
  intervalN: z.number().int().min(1).max(52).default(1),
  dayOfMonth: z.number().int().min(1).max(31).optional().nullable(),
  endsOn: dateKeySchema.optional().nullable(),
});

export const reminderInputSchema = z.object({
  remindType: z.enum(REMIND_TYPES),
  remindTime: timeSchema,
  daysBefore: z.number().int().min(0).max(365).optional(),
});

export type ReminderInput = z.infer<typeof reminderInputSchema>;

/**
 * `daysBefore` real de un recordatorio: los tipos fijos lo imponen,
 * `custom` respeta lo que mande el cliente.
 */
export function resolveDaysBefore(input: ReminderInput): number {
  if (input.remindType === "same_day") return 0;
  if (input.remindType === "day_before") return 1;
  return input.daysBefore ?? 0;
}

export const eventFieldsSchema = z.object({
  title: z.string().trim().min(1, "El título es obligatorio").max(200),
  date: dateKeySchema,
  time: timeSchema,
  category: categorySchema,
  location: z.string().trim().max(200).optional().nullable(),
  // Sin el refine de esquema, `javascript:...`/`data:...` pasan `.url()`
  // igual (Zod solo exige un WHATWG URL válido, no restringe el esquema) y
  // esto se renderiza luego como <a href={meetingLink}> sin sanitizar —
  // stored XSS. Solo http/https.
  meetingLink: z
    .string()
    .trim()
    .url("El link debe ser una URL válida")
    .max(500)
    .refine((v) => /^https?:\/\//i.test(v), "Solo se permiten enlaces http:// o https://")
    .optional()
    .nullable()
    .or(z.literal("")),
  notes: z.string().trim().max(1000).optional().nullable(),
});

export const eventsQuerySchema = z.object({
  from: dateKeySchema.optional(),
  to: dateKeySchema.optional(),
  category: categorySchema.optional(),
});

export const deleteRecurrenceSchema = z.object({
  deleteRecurrence: z.enum(["this", "future", "all"]).optional(),
});

/** Normaliza un opcional de texto: `""`/espacios → `null`. */
export function nullableText(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/** `params.id` numérico. Lanza 400 si no es un entero positivo. */
export function parseId(raw: string | string[] | undefined): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw badRequest("id inválido");
  return id;
}

/** Convierte un `URLSearchParams` en objeto plano, omitiendo valores vacíos. */
export function queryObject(searchParams: URLSearchParams): Record<string, string> {
  const out: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    if (value !== "") out[key] = value;
  });
  return out;
}

// ─────────────────────────────────────────
// Aritmética de fechas (UTC)
// ─────────────────────────────────────────
//
// Las columnas `@db.Date` se guardan como medianoche UTC (ver `parseDateKey`).
// Toda la aritmética del servidor se hace en UTC a mano en vez de con
// `date-fns`, porque sus helpers operan en hora local y desplazarían el día
// en zonas con offset negativo (y en los saltos de mes de `addMonths`).
// En el cliente sí se usa `date-fns`, donde las fechas son locales.

export function addUtcDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86_400_000);
}

export function daysInUtcMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

/** Suma meses conservando el día, recortándolo al último día del mes destino. */
export function addUtcMonths(date: Date, months: number, dayOfMonth?: number | null): Date {
  const year = date.getUTCFullYear();
  const monthIndex = date.getUTCMonth() + months;
  const targetYear = year + Math.floor(monthIndex / 12);
  const targetMonth = ((monthIndex % 12) + 12) % 12;
  const wanted = dayOfMonth ?? date.getUTCDate();
  const day = Math.min(wanted, daysInUtcMonth(targetYear, targetMonth));
  return new Date(Date.UTC(targetYear, targetMonth, day));
}

/** Date de una columna `@db.Date` → `"YYYY-MM-DD"`. */
export function toDateKeyUTC(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// ─────────────────────────────────────────
// Recurrencia
// ─────────────────────────────────────────

export interface RecurrenceInput {
  frequency: RecurrenceFrequency;
  intervalN: number;
  dayOfMonth?: number | null;
  endsOn?: string | null;
}

/**
 * Materializa las fechas de una serie recurrente, empezando por `start`.
 *
 * TOPE DE GENERACIÓN: se corta en la primera de estas tres condiciones —
 *   1. `endsOn` de la regla (inclusive),
 *   2. `RECURRENCE_MAX_YEARS` (2 años) desde la fecha inicial,
 *   3. `RECURRENCE_MAX_OCCURRENCES` (400) filas.
 * Es deliberado: las ocurrencias se guardan como filas reales de
 * `CalendarEvent` con el mismo `recurrenceId`, que es lo que hace posible
 * el borrado `this | future | all` sin expandir reglas al vuelo.
 */
export function generateOccurrences(startKey: string, rule: RecurrenceInput): Date[] {
  const start = parseDateKey(startKey);

  const horizon = new Date(
    Date.UTC(
      start.getUTCFullYear() + RECURRENCE_MAX_YEARS,
      start.getUTCMonth(),
      start.getUTCDate()
    )
  );
  const endsOn = rule.endsOn ? parseDateKey(rule.endsOn) : null;
  const limit = endsOn && endsOn.getTime() < horizon.getTime() ? endsOn : horizon;

  const interval = Math.max(1, rule.intervalN);
  const dates: Date[] = [];

  for (let i = 0; dates.length < RECURRENCE_MAX_OCCURRENCES; i++) {
    let next: Date;
    if (rule.frequency === "daily") next = addUtcDays(start, i * interval);
    else if (rule.frequency === "weekly") next = addUtcDays(start, i * interval * 7);
    else next = addUtcMonths(start, i * interval, i === 0 ? null : rule.dayOfMonth);

    if (next.getTime() > limit.getTime()) break;
    dates.push(next);
    // Guarda contra reglas degeneradas que no avanzan.
    if (i > RECURRENCE_MAX_OCCURRENCES * 2) break;
  }

  if (dates.length === 0) dates.push(start);
  return dates;
}

// ─────────────────────────────────────────
// Consultas
// ─────────────────────────────────────────

export function eventWhere(filters: z.infer<typeof eventsQuerySchema>): Prisma.CalendarEventWhereInput {
  const where: Prisma.CalendarEventWhereInput = {};
  if (filters.category) where.category = filters.category;
  if (filters.from || filters.to) {
    where.date = {
      ...(filters.from ? { gte: parseDateKey(filters.from) } : {}),
      ...(filters.to ? { lte: parseDateKey(filters.to) } : {}),
    };
  }
  return where;
}

export const eventInclude = {
  reminders: { orderBy: { id: "asc" } },
  recurrence: true,
} satisfies Prisma.CalendarEventInclude;

/** Datos de escritura comunes a create y update. */
export function eventData(fields: z.infer<typeof eventFieldsSchema>) {
  return {
    title: fields.title,
    time: parseTime(fields.time),
    category: fields.category,
    location: nullableText(fields.location),
    meetingLink: nullableText(fields.meetingLink),
    notes: nullableText(fields.notes),
  };
}

/** Recordatorio → fila lista para `createMany`, con el `daysBefore` resuelto. */
export function reminderData(input: ReminderInput, eventId: number) {
  return {
    eventId,
    remindType: input.remindType,
    remindTime: parseTime(input.remindTime),
    daysBefore: resolveDaysBefore(input),
  };
}

/**
 * Instante de disparo de un recordatorio: fecha del evento menos `daysBefore`,
 * a la hora `remindTime`. Ambos campos se guardan en UTC (`@db.Date`/`@db.Time`).
 */
export function reminderTriggerAt(eventDate: Date, remindTime: Date, daysBefore: number): Date {
  const msOfDay =
    remindTime.getUTCHours() * 3_600_000 +
    remindTime.getUTCMinutes() * 60_000 +
    remindTime.getUTCSeconds() * 1_000;
  return new Date(addUtcDays(eventDate, -daysBefore).getTime() + msOfDay);
}

/**
 * Borra eventos y sus recordatorios (el schema no declara `onDelete: Cascade`,
 * así que la cascada se hace explícita) y limpia la `RecurrenceRule` si queda
 * huérfana. Todo dentro de una transacción.
 */
export async function deleteEventsCascade(eventIds: number[], recurrenceId: number | null) {
  if (eventIds.length === 0) return 0;

  return prisma.$transaction(async (tx) => {
    await tx.calendarReminder.deleteMany({ where: { eventId: { in: eventIds } } });
    const { count } = await tx.calendarEvent.deleteMany({ where: { id: { in: eventIds } } });

    if (recurrenceId) {
      const remaining = await tx.calendarEvent.count({ where: { recurrenceId } });
      const stillUsedByTasks = await tx.task.count({ where: { recurrenceId } });
      if (remaining === 0 && stillUsedByTasks === 0) {
        await tx.recurrenceRule.delete({ where: { id: recurrenceId } }).catch(() => undefined);
      }
    }

    return count;
  });
}
