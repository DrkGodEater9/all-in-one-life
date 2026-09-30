/**
 * Helpers internos del módulo de Nutrición.
 * No es una route: Next solo trata como endpoint los archivos `route.ts`.
 */
import { z } from "zod";
import { prisma } from "@/lib/db";
import { parseDateKey } from "@/lib/utils";

// ─────────────────────────────────────────
// Constantes
// ─────────────────────────────────────────

export const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;
export type MealType = (typeof MEAL_TYPES)[number];

export const FOOD_STATES = ["raw", "cooked", "unknown"] as const;
export type FoodState = (typeof FOOD_STATES)[number];

/** Meta por defecto cuando aún no se ha guardado ninguna. */
export const DEFAULT_GOAL = {
  kcal: 2000,
  proteinG: 150,
  carbsG: 200,
  fatG: 65,
} as const;

export const DEFAULT_WATER_GOAL_ML = 2000;
export const DEFAULT_WATER_AMOUNT_ML = 250;

// ─────────────────────────────────────────
// Esquemas Zod reutilizables
// ─────────────────────────────────────────

export const dateKeySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "La fecha debe ser YYYY-MM-DD");

export const mealTypeSchema = z.enum(MEAL_TYPES);
export const foodStateSchema = z.enum(FOOD_STATES);

/** Lee `?date=` y cae al día de hoy (en UTC, igual que las columnas @db.Date). */
export function readDateParam(searchParams: URLSearchParams) {
  const raw = searchParams.get("date");
  const key = raw ? dateKeySchema.parse(raw) : todayKey();
  return { key, date: parseDateKey(key) };
}

// ─────────────────────────────────────────
// Fechas
// ─────────────────────────────────────────

/**
 * 'YYYY-MM-DD' de un valor de columna @db.Date.
 * Prisma devuelve esas columnas como Date a medianoche UTC, así que hay que
 * leerlas en UTC: `toDateKey` (local) desplazaría el día en husos negativos.
 */
export function dbDateKey(value: Date) {
  return value.toISOString().slice(0, 10);
}

export function todayKey() {
  return dbDateKey(new Date());
}

/** Suma (o resta) días a una clave 'YYYY-MM-DD'. */
export function shiftDateKey(key: string, days: number) {
  const d = parseDateKey(key);
  d.setUTCDate(d.getUTCDate() + days);
  return dbDateKey(d);
}

/** Lista de claves de fecha desde `from` hasta `to`, ambos inclusive. */
export function dateKeyRange(from: string, to: string) {
  const keys: string[] = [];
  let cursor = from;
  // Guarda de seguridad: nunca más de ~5 años de serie.
  for (let i = 0; i < 2000 && cursor <= to; i += 1) {
    keys.push(cursor);
    cursor = shiftDateKey(cursor, 1);
  }
  return keys;
}

// ─────────────────────────────────────────
// Números
// ─────────────────────────────────────────

/** Prisma.Decimal | number | null -> number (0 si no es finito). */
export function num(value: unknown): number {
  if (value === null || value === undefined) return 0;
  const n = Number(value.toString());
  return Number.isFinite(n) ? n : 0;
}

/** Igual que `num` pero conserva el null, para distinguir "sin dato" de 0. */
export function numOrNull(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const n = Number(value.toString());
  return Number.isFinite(n) ? n : null;
}

export function round2(n: number) {
  return Math.round(n * 100) / 100;
}

// ─────────────────────────────────────────
// Macros
// ─────────────────────────────────────────

export type Per100g = {
  kcal100g: number | null;
  protein100g: number | null;
  carbs100g: number | null;
  fat100g: number | null;
};

export type Macros = {
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
};

/** Escala los valores por 100 g a la cantidad real ingerida. */
export function macrosFor(per100g: Per100g, amountG: number): Macros {
  const factor = amountG / 100;
  return {
    kcal: round2(num(per100g.kcal100g) * factor),
    proteinG: round2(num(per100g.protein100g) * factor),
    carbsG: round2(num(per100g.carbs100g) * factor),
    fatG: round2(num(per100g.fat100g) * factor),
  };
}

/** ¿Faltan datos nutricionales? Entonces el item va como estimado. */
export function isIncomplete(per100g: Per100g) {
  return (
    per100g.kcal100g === null ||
    per100g.protein100g === null ||
    per100g.carbs100g === null ||
    per100g.fat100g === null
  );
}

export const EMPTY_MACROS: Macros = { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 };

export function sumMacros(items: Array<Partial<Macros>>): Macros {
  return items.reduce<Macros>(
    (acc, it) => ({
      kcal: round2(acc.kcal + (it.kcal ?? 0)),
      proteinG: round2(acc.proteinG + (it.proteinG ?? 0)),
      carbsG: round2(acc.carbsG + (it.carbsG ?? 0)),
      fatG: round2(acc.fatG + (it.fatG ?? 0)),
    }),
    { ...EMPTY_MACROS }
  );
}

// ─────────────────────────────────────────
// Meta vigente
// ─────────────────────────────────────────

/** `NutritionGoal` es una sola fila; si no existe, se devuelve la meta por defecto. */
export async function getGoal() {
  const goal = await prisma.nutritionGoal.findFirst({ orderBy: { id: "asc" } });
  if (!goal) {
    return { id: null, ...DEFAULT_GOAL, updatedAt: null as string | null };
  }
  return {
    id: goal.id,
    kcal: goal.kcal,
    proteinG: goal.proteinG,
    carbsG: goal.carbsG,
    fatG: goal.fatG,
    updatedAt: goal.updatedAt.toISOString(),
  };
}

// ─────────────────────────────────────────
// Resultados de búsqueda de alimentos
// ─────────────────────────────────────────

export type FoodResult = {
  /** Clave estable para listas del cliente. */
  key: string;
  source: "favorite" | "cache" | "off";
  foodCacheId: number | null;
  favoriteId: number | null;
  offId: string | null;
  name: string;
  kcal100g: number;
  protein100g: number;
  carbs100g: number;
  fat100g: number;
};

type OffProduct = {
  code?: unknown;
  product_name?: unknown;
  product_name_es?: unknown;
  generic_name?: unknown;
  brands?: unknown;
  nutriments?: Record<string, unknown>;
};

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function nutriment(nutriments: Record<string, unknown> | undefined, key: string) {
  if (!nutriments) return null;
  const raw = nutriments[key];
  if (raw === null || raw === undefined || raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? round2(n) : null;
}

const OFF_ENDPOINT = "https://world.openfoodfacts.org/cgi/search.pl";
const OFF_TIMEOUT_MS = 4500;

/**
 * Consulta OpenFoodFacts y normaliza a valores por 100 g.
 * Nunca lanza: ante fallo, timeout o respuesta rara devuelve [].
 */
export async function searchOpenFoodFacts(q: string) {
  const url =
    `${OFF_ENDPOINT}?search_terms=${encodeURIComponent(q)}` +
    `&search_simple=1&action=process&json=1&page_size=20`;

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "PersonalOS/1.0 (self-hosted personal tracker)",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(OFF_TIMEOUT_MS),
      cache: "no-store",
    });
    if (!res.ok) return [];

    const payload = (await res.json()) as { products?: unknown };
    const products = Array.isArray(payload?.products)
      ? (payload.products as OffProduct[])
      : [];

    const seen = new Set<string>();
    const normalized: Array<Per100g & { offId: string; name: string }> = [];

    for (const p of products) {
      const offId = str(p.code);
      const base =
        str(p.product_name_es) || str(p.product_name) || str(p.generic_name);
      if (!offId || !base || seen.has(offId)) continue;

      const kcal100g = nutriment(p.nutriments, "energy-kcal_100g");
      // Descarta lo que no tenga nombre ni kcal: no sirve para registrar comida.
      if (kcal100g === null || kcal100g <= 0) continue;

      const brand = str(p.brands).split(",")[0]?.trim() ?? "";
      seen.add(offId);
      normalized.push({
        offId,
        name: brand && !base.toLowerCase().includes(brand.toLowerCase())
          ? `${base} · ${brand}`
          : base,
        kcal100g,
        protein100g: nutriment(p.nutriments, "proteins_100g"),
        carbs100g: nutriment(p.nutriments, "carbohydrates_100g"),
        fat100g: nutriment(p.nutriments, "fat_100g"),
      });
    }

    return normalized;
  } catch {
    // Degradación con gracia: la ruta responde con lo cacheado.
    return [];
  }
}
