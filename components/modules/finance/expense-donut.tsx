"use client";

import * as React from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatMoney } from "@/lib/utils";
import { EmptyState } from "@/components/ui";
import { PieChart as PieIcon } from "lucide-react";
import { categoryColor } from "./constants";
import type { CategoryBreakdown } from "./types";

export interface ExpenseDonutProps {
  data: CategoryBreakdown[];
  total: number;
}

interface TooltipPayloadItem {
  payload?: CategoryBreakdown;
}

function DonutTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
}) {
  const item = active ? payload?.[0]?.payload : undefined;
  if (!item) return null;
  return (
    <div className="rounded-md border border-border bg-surface px-3 py-2">
      <p className="text-xs capitalize text-text">{item.category}</p>
      <p className="font-mono text-xs tabular-nums text-text-2">
        {formatMoney(item.total)} · {item.percentage}%
      </p>
    </div>
  );
}

/** Dona de gastos por categoría del mes. */
export function ExpenseDonut({ data, total }: ExpenseDonutProps) {
  if (data.length === 0) {
    return (
      <EmptyState
        icon={PieIcon}
        title="Sin gastos este mes"
        description="Cuando registres gastos verás aquí el desglose por categoría."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <div className="relative h-48 w-full sm:w-48 sm:shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="total"
              nameKey="category"
              innerRadius="62%"
              outerRadius="92%"
              paddingAngle={2}
              stroke="var(--color-bg)"
              strokeWidth={2}
              isAnimationActive={false}
            >
              {data.map((entry) => (
                <Cell key={entry.category} fill={categoryColor(entry.category)} />
              ))}
            </Pie>
            <Tooltip content={<DonutTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-sm tabular-nums text-text">
            {formatMoney(total)}
          </span>
          <span className="text-[10px] uppercase tracking-wide text-text-3">
            gastado
          </span>
        </div>
      </div>

      <ul className="min-w-0 flex-1 space-y-1.5">
        {data.map((entry) => (
          <li key={entry.category} className="flex items-center gap-2 text-xs">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: categoryColor(entry.category) }}
            />
            <span className="min-w-0 flex-1 truncate capitalize text-text-2">
              {entry.category}
            </span>
            <span className="font-mono tabular-nums text-text">
              {formatMoney(entry.total)}
            </span>
            <span className="w-10 shrink-0 text-right font-mono tabular-nums text-text-3">
              {entry.percentage}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
