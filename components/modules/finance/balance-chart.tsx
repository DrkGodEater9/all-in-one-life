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
import type { BalancePoint, SingleBalancePoint } from "./chart-data";

/** Línea de saldo de una sola billetera (Diario, Ahorros o un crédito). */
export function SingleBalanceChart({ data }: { data: SingleBalancePoint[] }) {
  if (data.length === 0) {
    return (
      <EmptyState
        icon={LineIcon}
        title="Sin histórico todavía"
        description="Registra movimientos para ver cómo evoluciona el saldo."
      />
    );
  }

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="var(--color-border)" strokeDasharray="2 4" vertical={false} />
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
          <Tooltip
            content={({ active, payload, label }) =>
              active && payload && payload.length > 0 ? (
                <div className="rounded-md border border-border bg-surface px-3 py-2">
                  <p className="mb-1 text-[11px] text-text-3">
                    {label ? formatDateLabel(String(label)) : ""}
                  </p>
                  <p className="font-mono text-xs tabular-nums text-text">
                    {formatMoney((payload[0]?.value as number) ?? 0)}
                  </p>
                </div>
              ) : null
            }
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="var(--color-accent)"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
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
