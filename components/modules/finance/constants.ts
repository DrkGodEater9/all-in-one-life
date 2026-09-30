/**
 * Constantes del módulo de Finanzas.
 *
 * Este archivo lo importan tanto los componentes cliente como las API routes,
 * por eso no lleva `"use client"` ni depende de React.
 */

/** Categorías predefinidas de gasto/ingreso (orden del spec). */
export const FINANCE_CATEGORIES = [
  "alimentación",
  "transporte",
  "salud",
  "entretenimiento",
  "suscripciones",
  "ropa",
  "educación",
  "otro",
] as const;

export type FinanceCategory = (typeof FINANCE_CATEGORIES)[number];

/** Nombres de las dos fuentes de dinero. */
export const SOURCE_NAMES = ["daily", "savings"] as const;
export type SourceName = (typeof SOURCE_NAMES)[number];

export const SOURCE_LABELS: Record<SourceName, string> = {
  daily: "Diario",
  savings: "Ahorros",
};

export const TRANSACTION_TYPES = ["expense", "income"] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const TYPE_LABELS: Record<TransactionType, string> = {
  expense: "Gasto",
  income: "Ingreso",
};

export const DEBT_DIRECTIONS = ["i_owe", "they_owe_me"] as const;
export type DebtDirection = (typeof DEBT_DIRECTIONS)[number];

export const DIRECTION_LABELS: Record<DebtDirection, string> = {
  i_owe: "Debo",
  they_owe_me: "Me deben",
};

/**
 * Colores de la dona de gastos por categoría.
 * Se apoyan en los tokens del sistema; el violeta del acento queda para
 * la categoría más frecuente y el resto son variaciones de opacidad
 * sobre los tokens de estado para no inventar paleta nueva.
 */
export const CATEGORY_COLORS: Record<string, string> = {
  "alimentación": "var(--color-accent)",
  transporte: "var(--color-cat-study)",
  salud: "var(--color-cat-medical)",
  entretenimiento: "var(--color-cat-personal)",
  suscripciones: "var(--color-cat-work)",
  ropa: "var(--color-yellow)",
  "educación": "var(--color-green)",
  otro: "var(--color-text-3)",
};

export function categoryColor(category: string) {
  return CATEGORY_COLORS[category] ?? "var(--color-text-3)";
}
