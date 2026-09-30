"use client";

import * as React from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatMoney } from "@/lib/utils";
import { EmptyState } from "@/components/ui";
import { LineChart as LineIcon } from "lucide-react";
import { dateKeyOf, formatDateLabel } from "./finance-utils";
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

interface TooltipItem {
  dataKey?: string | number;
  value?: number;
  color?: string;
}

function BalanceTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipItem[];
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-md border border-border bg-surface px-3 py-2">
      <p className="mb-1 text-[11px] text-text-3">
        {label ? formatDateLabel(label) : ""}
      </p>
      {payload.map((item) => (
        <p key={String(item.dataKey)} className="flex items-center gap-2 text-xs">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: item.color }}
          />
          <span className="text-text-2">
            {item.dataKey === "daily" ? "Diario" : "Ahorros"}
          </span>
          <span className="ml-auto font-mono tabular-nums text-text">
            {formatMoney(item.value ?? 0)}
          </span>
        </p>
      ))}
    </div>
  );
}

export interface BalanceChartProps {
  data: BalancePoint[];
}

/** Evolución del saldo de daily y savings en el tiempo. */
export function BalanceChart({ data }: BalanceChartProps) {
  if (data.length === 0) {
    return (
      <EmptyState
        icon={LineIcon}
        title="Sin histórico todavía"
        description="Registra transacciones para ver cómo evoluciona tu saldo."
      />
    );
  }

  return (
    <div className="w-full">
      <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid
            stroke="var(--color-border)"
            strokeDasharray="2 4"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            tickFormatter={(value: string) => formatDateLabel(value)}
            tick={{ fill: "var(--color-text-3)", fontSize: 10 }}
            axisLine={{ stroke: "var(--color-border)" }}
            tickLine={false}
            minTickGap={24}
          />
          <YAxis
            tick={{ fill: "var(--color-text-3)", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={56}
            tickFormatter={(value: number) =>
              new Intl.NumberFormat("es-CO", {
                notation: "compact",
                maximumFractionDigits: 1,
              }).format(value)
            }
          />
          <Tooltip content={<BalanceTooltip />} />
          <Line
            type="monotone"
            dataKey="daily"
            stroke="var(--color-accent)"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="savings"
            stroke="var(--color-green)"
            strokeWidth={2}
            strokeDasharray="4 3"
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
      </div>

      <div className="mt-2 flex items-center gap-4 text-[11px] text-text-2">
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded-full bg-accent" /> Diario
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded-full bg-green" /> Ahorros
        </span>
      </div>
    </div>
  );
}
