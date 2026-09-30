/** Utilidades locales del módulo de Finanzas. */
import { formatMoney } from "@/lib/utils";
import { SOURCE_LABELS, type SourceName } from "./constants";

/** ISO de una columna @db.Date → 'YYYY-MM-DD'. */
export function dateKeyOf(iso: string): string {
  return iso.slice(0, 10);
}

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

/** 'YYYY-MM-DD' (o ISO) → '30 sep' / '30 sep 2024' si es otro año. */
export function formatDateLabel(iso: string, now = new Date()): string {
  const key = dateKeyOf(iso);
  const [year, month, day] = key.split("-").map(Number);
  if (!year || !month || !day) return key;
  const label = `${day} ${MONTHS_SHORT[month - 1]}`;
  return year === now.getFullYear() ? label : `${label} ${year}`;
}

/** 'YYYY-MM' → 'septiembre 2024'. */
export function formatMonthLabel(month: string): string {
  const [year, m] = month.split("-").map(Number);
  const long = new Intl.DateTimeFormat("es-CO", {
    month: "long",
    year: "numeric",
  }).format(new Date(Date.UTC(year, m - 1, 1)));
  return long;
}

/** Etiqueta legible de una fuente ('daily' → 'Diario'). */
export function sourceLabel(name: string): string {
  return SOURCE_LABELS[name as SourceName] ?? name;
}

/** Monto con signo, tal como se pinta en la lista. */
export function signedMoney(type: string, amount: number): string {
  return `${type === "income" ? "+" : "−"}${formatMoney(amount)}`;
}

/** Mes actual como 'YYYY-MM' en hora local. */
export function currentMonthKey(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/** Desplaza un 'YYYY-MM' n meses. */
export function shiftMonth(month: string, delta: number): string {
  const [year, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(year, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** 'YYYY-MM-DD' de hace n meses respecto a hoy. */
export function dateKeyMonthsAgo(months: number, now = new Date()): string {
  const d = new Date(now.getFullYear(), now.getMonth() - months, now.getDate());
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}
