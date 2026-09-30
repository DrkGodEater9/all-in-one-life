/** Formateo de fechas del módulo Tareas. Las fechas llegan como 'YYYY-MM-DD'. */

import { toDateKey } from "@/lib/utils";

const MONTHS_SHORT = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
];

const MONTHS_LONG = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

/** 'YYYY-MM-DD' → '12 oct'. Devuelve el propio valor si no parsea. */
export function formatDateKeyShort(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  if (!y || !m || !d) return key;
  return `${d} ${MONTHS_SHORT[m - 1]}`;
}

/** 'YYYY-MM-DD' → '12 de octubre de 2025'. */
export function formatDateKeyLong(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  if (!y || !m || !d) return key;
  return `${d} de ${MONTHS_LONG[m - 1]} de ${y}`;
}

/** Etiqueta amable: Hoy / Mañana / Ayer, y si no la fecha corta. */
export function formatDateKeyRelative(key: string): string {
  const today = toDateKey();
  if (key === today) return "Hoy";
  if (key === shiftDateKey(today, 1)) return "Mañana";
  if (key === shiftDateKey(today, -1)) return "Ayer";
  return formatDateKeyShort(key);
}

/** Desplaza una clave de fecha N días, sin salirse del calendario local. */
export function shiftDateKey(key: string, days: number): string {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(y, m - 1, d + days);
  return toDateKey(date);
}

/** Una tarea abierta con fecha anterior a hoy va vencida. */
export function isOverdue(dateKey: string | null): boolean {
  if (!dateKey) return false;
  return dateKey < toDateKey();
}

/** Clave de agrupación por fecha en la lista: las sin fecha van al final. */
export function dateGroupLabel(dateKey: string | null): string {
  return dateKey ? formatDateKeyRelative(dateKey) : "Sin fecha";
}
