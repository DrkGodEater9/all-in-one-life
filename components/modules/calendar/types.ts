/**
 * Tipos de transporte del módulo Calendario.
 *
 * `ok()` serializa `Date -> ISO string`, así que en el cliente:
 *   - `date`  llega como `"YYYY-MM-DDT00:00:00.000Z"`  (columna @db.Date)
 *   - `time`  llega como `"1970-01-01THH:mm:00.000Z"`  (columna @db.Time)
 * Usa `dateKeyOf()` y `formatTime()` de `@/lib/utils` para pintarlos.
 */
import type { EventCategory, RecurrenceFrequency, RemindType } from "./constants";

export interface ReminderDTO {
  id: number;
  eventId: number;
  remindType: RemindType;
  remindTime: string;
  daysBefore: number;
  isSent: boolean;
}

export interface RecurrenceDTO {
  id: number;
  frequency: RecurrenceFrequency;
  intervalN: number;
  dayOfMonth: number | null;
  endsOn: string | null;
}

export interface CalendarEventDTO {
  id: number;
  title: string;
  date: string;
  time: string;
  category: EventCategory;
  location: string | null;
  meetingLink: string | null;
  notes: string | null;
  recurrenceId: number | null;
  source: string;
  sourceTaskId: number | null;
  reminders: ReminderDTO[];
  recurrence?: RecurrenceDTO | null;
}

export interface CreateEventResponse {
  event: CalendarEventDTO;
  /** Cuántas filas de `CalendarEvent` se materializaron (1 si no es recurrente). */
  occurrences: number;
}

/** Item de la vista Día: evento del calendario o tarea con fecha. */
export type DayItem =
  | {
      kind: "event";
      id: number;
      title: string;
      time: string;
      category: EventCategory;
      location: string | null;
      meetingLink: string | null;
      notes: string | null;
      recurrenceId: number | null;
      reminders: ReminderDTO[];
    }
  | {
      kind: "task";
      id: number;
      title: string;
      time: string | null;
      description: string | null;
      status: string;
      urgent: boolean;
      important: boolean;
    };

export interface DayResponse {
  date: string;
  items: DayItem[];
}

/** `"YYYY-MM-DDT00:00:00.000Z"` (o ya `"YYYY-MM-DD"`) → `"YYYY-MM-DD"`. */
export function dateKeyOf(value: string): string {
  return value.slice(0, 10);
}
