import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Formatea un número como moneda local (sin símbolo por defecto). */
export function formatMoney(value: number | string, currency = "COP") {
  const n = typeof value === "string" ? Number(value) : value;
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number.isFinite(n) ? n : 0);
}

export function formatNumber(value: number | string, decimals = 0) {
  const n = typeof value === "string" ? Number(value) : value;
  return new Intl.NumberFormat("es-CO", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Number.isFinite(n) ? n : 0);
}

/** YYYY-MM-DD en hora local, el formato que usan todas las API routes. */
export function toDateKey(date: Date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Parsea 'YYYY-MM-DD' a un Date UTC medianoche, para columnas @db.Date. */
export function parseDateKey(key: string) {
  return new Date(`${key}T00:00:00.000Z`);
}

/**
 * Lee una columna @db.Date de vuelta a 'YYYY-MM-DD'.
 *
 * Prisma devuelve esas columnas a medianoche UTC, así que hay que leerlas en
 * UTC: usar `toDateKey` (que es local) restaría un día en husos negativos como
 * el de Colombia. Regla: `toDateKey` para el "hoy" del usuario en el cliente,
 * `dbDateKey` para cualquier fecha que venga de la base.
 */
export function dbDateKey(value: Date | string): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toISOString().slice(0, 10);
}

/** Parsea 'HH:mm' a un Date UTC, para columnas @db.Time. */
export function parseTime(hhmm: string) {
  return new Date(`1970-01-01T${hhmm.length === 5 ? hhmm : hhmm.slice(0, 5)}:00.000Z`);
}

/** Formatea una columna @db.Time a 'HH:mm'. */
export function formatTime(value: Date | string | null | undefined) {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toISOString().slice(11, 16);
}

/** Prisma Decimal -> number, seguro para serializar al cliente. */
export function toNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  return Number(value.toString());
}
