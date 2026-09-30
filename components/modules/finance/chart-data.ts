/**
 * Funciones puras de series para las gráficas de finanzas.
 *
 * Viven aparte de `balance-chart.tsx` a propósito: ese archivo importa
 * `recharts` (~100 kB) y se carga de forma diferida. Si estas funciones
 * siguieran ahí, importarlas para calcular datos arrastraría recharts al
 * bundle inicial y anularía la carga diferida.
 */
import { dateKeyOf } from "./finance-utils";
import type { Balance, Transaction } from "./types";

export interface BalancePoint {
  date: string;
  daily: number;
  savings: number;
}

/**
 * Reconstruye la evolución del saldo hacia atrás desde el saldo actual:
 * saldo al inicio de la ventana = saldo actual − suma de los movimientos
 * de la ventana. Luego se acumula día a día.
 */
export function buildBalanceSeries(
  transactions: Transaction[],
  balance: Balance
): BalancePoint[] {
  const nameById = new Map<number, string>();
  for (const source of balance.sources) nameById.set(source.id, source.name);

  const deltasByDate = new Map<string, { daily: number; savings: number }>();
  let totalDaily = 0;
  let totalSavings = 0;

  for (const tx of transactions) {
    const name = nameById.get(tx.sourceId) ?? tx.source?.name;
    if (name !== "daily" && name !== "savings") continue;

    const delta = tx.type === "income" ? tx.amount : -tx.amount;
    const key = dateKeyOf(tx.date);
    const entry = deltasByDate.get(key) ?? { daily: 0, savings: 0 };
    entry[name] += delta;
    deltasByDate.set(key, entry);

    if (name === "daily") totalDaily += delta;
    else totalSavings += delta;
  }

  const dates = Array.from(deltasByDate.keys()).sort();
  if (dates.length === 0) return [];

  let daily = balance.daily - totalDaily;
  let savings = balance.savings - totalSavings;

  const points: BalancePoint[] = [];
  for (const date of dates) {
    const entry = deltasByDate.get(date)!;
    daily += entry.daily;
    savings += entry.savings;
    points.push({
      date,
      daily: Math.round(daily * 100) / 100,
      savings: Math.round(savings * 100) / 100,
    });
  }

  return points;
}

export interface SingleBalancePoint {
  date: string;
  value: number;
}

/** Igual que `buildBalanceSeries`, pero reconstruido hacia atrás para UNA sola fuente. */
export function buildSingleSourceSeries(
  transactions: Transaction[],
  currentBalance: number,
  sourceId: number
): SingleBalancePoint[] {
  const deltasByDate = new Map<string, number>();
  let totalDelta = 0;

  for (const tx of transactions) {
    if (tx.sourceId !== sourceId) continue;
    const delta = tx.type === "income" ? tx.amount : -tx.amount;
    const key = dateKeyOf(tx.date);
    deltasByDate.set(key, (deltasByDate.get(key) ?? 0) + delta);
    totalDelta += delta;
  }

  const dates = Array.from(deltasByDate.keys()).sort();
  if (dates.length === 0) return [];

  let value = currentBalance - totalDelta;
  const points: SingleBalancePoint[] = [];
  for (const date of dates) {
    value += deltasByDate.get(date)!;
    points.push({ date, value: Math.round(value * 100) / 100 });
  }
  return points;
}
