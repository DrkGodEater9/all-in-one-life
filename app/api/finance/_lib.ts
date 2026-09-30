/**
 * Helpers compartidos por las rutas de `/api/finance`.
 *
 * No es una route: Next solo trata como endpoint los archivos `route.ts`.
 */
import { Prisma, type FinanceSource } from "@prisma/client";
import { prisma } from "@/lib/db";
import { badRequest } from "@/lib/http";
import { parseDateKey, toDateKey } from "@/lib/utils";
import { z } from "zod";
import {
  FINANCE_CATEGORIES,
  SOURCE_NAMES,
  type SourceName,
} from "@/components/modules/finance/constants";

// ─────────────────────────────────────────
// Fuentes
// ─────────────────────────────────────────

/**
 * Devuelve las dos fuentes (`daily` y `savings`) creándolas con balance 0
 * si el seed no llegó a correr. Idempotente.
 */
export async function ensureSources(): Promise<Record<SourceName, FinanceSource>> {
  const existing = await prisma.financeSource.findMany({
    where: { name: { in: [...SOURCE_NAMES] } },
    orderBy: { id: "asc" },
  });

  const byName = new Map<string, FinanceSource>();
  for (const source of existing) {
    // Si por lo que sea hubiese duplicados, nos quedamos con el más antiguo.
    if (!byName.has(source.name)) byName.set(source.name, source);
  }

  for (const name of SOURCE_NAMES) {
    if (!byName.has(name)) {
      byName.set(name, await prisma.financeSource.create({ data: { name, balance: 0 } }));
    }
  }

  return {
    daily: byName.get("daily")!,
    savings: byName.get("savings")!,
  };
}

/** Valida que el `sourceId` recibido corresponda a una fuente real. */
export async function assertSourceExists(sourceId: number): Promise<FinanceSource> {
  await ensureSources();
  const source = await prisma.financeSource.findUnique({ where: { id: sourceId } });
  if (!source) throw badRequest("La fuente indicada no existe");
  return source;
}

// ─────────────────────────────────────────
// Esquemas reutilizables
// ─────────────────────────────────────────

export const dateKeySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido, se espera YYYY-MM-DD");

export const monthKeySchema = z
  .string()
  .regex(/^\d{4}-\d{2}$/, "Formato de mes inválido, se espera YYYY-MM");

export const amountSchema = z
  .number({ invalid_type_error: "El monto debe ser un número" })
  .finite()
  .positive("El monto debe ser mayor que cero")
  .max(9_999_999_999, "El monto es demasiado grande");

export const categorySchema = z.enum(FINANCE_CATEGORIES);

export const transactionFiltersSchema = z.object({
  type: z.enum(["expense", "income"]).optional(),
  category: z.string().min(1).optional(),
  sourceId: z.coerce.number().int().positive().optional(),
  from: dateKeySchema.optional(),
  to: dateKeySchema.optional(),
});

export type TransactionFilters = z.infer<typeof transactionFiltersSchema>;

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
// Fechas
// ─────────────────────────────────────────

/**
 * Reexportados de `@/lib/utils` para que las rutas de finanzas tengan
 * un único punto de importación:
 * - `parseDateKey('YYYY-MM-DD')` → Date UTC medianoche (columnas @db.Date)
 * - `toDateKey(date)`            → 'YYYY-MM-DD' en hora local
 */
export { parseDateKey, toDateKey };

/** Date de una columna @db.Date → 'YYYY-MM-DD'. */
export function toDateKeyUTC(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Mes actual como 'YYYY-MM' en hora local. */
export function currentMonthKey(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/** Rango [inicio, finExclusivo) en UTC para un mes 'YYYY-MM'. */
export function monthRange(month: string): { start: Date; end: Date } {
  const [year, m] = month.split("-").map(Number);
  return {
    start: new Date(Date.UTC(year, m - 1, 1)),
    end: new Date(Date.UTC(year, m, 1)),
  };
}

// ─────────────────────────────────────────
// Consultas
// ─────────────────────────────────────────

/** Construye el `where` del listado y del export a partir de los filtros. */
export function transactionWhere(
  filters: TransactionFilters
): Prisma.FinanceTransactionWhereInput {
  const where: Prisma.FinanceTransactionWhereInput = {};
  if (filters.type) where.type = filters.type;
  if (filters.category) where.category = filters.category;
  if (filters.sourceId) where.sourceId = filters.sourceId;
  if (filters.from || filters.to) {
    where.date = {
      ...(filters.from ? { gte: parseDateKey(filters.from) } : {}),
      ...(filters.to ? { lte: parseDateKey(filters.to) } : {}),
    };
  }
  return where;
}

/** Decimal de Prisma (o number/string) → number. */
export function num(value: Prisma.Decimal | number | string | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return Number(value.toString());
}

/** Redondea a 2 decimales, que es la precisión de las columnas Decimal(12,2). */
export function money(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Efecto de una transacción sobre el balance de su fuente:
 * `income` suma, `expense` resta.
 */
export function balanceDelta(type: string, amount: number): number {
  return type === "income" ? money(amount) : -money(amount);
}
