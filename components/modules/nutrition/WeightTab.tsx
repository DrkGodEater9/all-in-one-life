"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Scale } from "lucide-react";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Button,
  Card,
  EmptyState,
  Input,
  Label,
  SectionHeader,
  Skeleton,
  Stat,
  toast,
} from "@/components/ui";
import { api } from "@/lib/api";
import { formatNumber } from "@/lib/utils";
import type { WeightLog } from "./types";

const schema = z.object({
  weightKg: z
    .number({ invalid_type_error: "Escribe tu peso" })
    .positive("Debe ser mayor que 0")
    .max(500, "Valor fuera de rango"),
});
type Values = z.infer<typeof schema>;

/** 'YYYY-MM-DD' -> 'DD MMM' para el eje de la gráfica. */
function shortLabel(dateKey: string) {
  const [, m, d] = dateKey.split("-");
  const months = [
    "ene", "feb", "mar", "abr", "may", "jun",
    "jul", "ago", "sep", "oct", "nov", "dic",
  ];
  return `${Number(d)} ${months[Number(m) - 1] ?? ""}`;
}

export function WeightTab({
  date,
  logs,
  loading,
  onChanged,
}: {
  date: string;
  logs: WeightLog[];
  loading: boolean;
  onChanged: () => void;
}) {
  const today = logs.find((l) => l.date === date) ?? null;
  const latest = logs.length > 0 ? logs[logs.length - 1] : null;
  const first = logs.length > 0 ? logs[0] : null;
  const delta = latest && first ? latest.weightKg - first.weightKg : 0;

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { weightKg: today?.weightKg ?? latest?.weightKg ?? 70 },
  });
  const [saving, setSaving] = React.useState(false);

  const resetTo = today?.weightKg ?? latest?.weightKg;
  React.useEffect(() => {
    if (resetTo !== undefined && !form.formState.isDirty) {
      form.reset({ weightKg: resetTo });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetTo]);

  const chartData = React.useMemo(
    () =>
      logs.map((l) => ({
        date: l.date,
        label: shortLabel(l.date),
        weightKg: l.weightKg,
      })),
    [logs]
  );

  async function onSubmit(values: Values) {
    setSaving(true);
    try {
      await api.post("/nutrition/weight", { weightKg: values.weightKg, date });
      toast({
        title: today ? "Peso actualizado" : "Peso registrado",
        description: `${formatNumber(values.weightKg, 1)} kg`,
      });
      form.reset({ weightKg: values.weightKg });
      onChanged();
    } catch (error) {
      toast({
        title: "No se pudo guardar el peso",
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Card className="p-4">
        <SectionHeader
          title="Peso de hoy"
          description={
            today
              ? "Ya registraste hoy; puedes corregirlo."
              : "Registra tu peso de la mañana, en ayunas."
          }
        />
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end"
        >
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="weightKg">Peso (kg)</Label>
            <Input
              id="weightKg"
              type="number"
              inputMode="decimal"
              step="0.1"
              min="1"
              className="font-mono"
              {...form.register("weightKg", { valueAsNumber: true })}
            />
            {form.formState.errors.weightKg ? (
              <p className="text-xs text-danger">
                {form.formState.errors.weightKg.message}
              </p>
            ) : null}
          </div>
          <Button type="submit" disabled={saving} className="sm:mb-[1px]">
            {saving ? <Loader2 className="animate-spin" /> : null}
            {today ? "Actualizar" : "Registrar"}
          </Button>
        </form>
      </Card>

      {logs.length > 0 ? (
        <Card className="p-4">
          <div className="flex flex-wrap items-start gap-6">
            <Stat
              label="Último peso"
              value={
                <span className="font-mono">
                  {formatNumber(latest?.weightKg ?? 0, 1)}
                  <span className="text-text-3"> kg</span>
                </span>
              }
            />
            <Stat
              label="Variación total"
              value={
                <span
                  className={
                    "font-mono " +
                    (delta > 0 ? "text-yellow" : delta < 0 ? "text-green" : "")
                  }
                >
                  {delta > 0 ? "+" : ""}
                  {formatNumber(delta, 1)}
                  <span className="text-text-3"> kg</span>
                </span>
              }
              sub={`${logs.length} ${logs.length === 1 ? "registro" : "registros"}`}
            />
          </div>

          <div className="mt-5 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 8, right: 8, bottom: 0, left: -16 }}
              >
                <XAxis
                  dataKey="label"
                  tick={{ fill: "var(--color-text-3)", fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: "var(--color-border)" }}
                  minTickGap={24}
                />
                <YAxis
                  tick={{ fill: "var(--color-text-3)", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  domain={["dataMin - 1", "dataMax + 1"]}
                  width={44}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-surface)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: "var(--color-text-2)" }}
                  itemStyle={{ color: "var(--color-text)" }}
                />
                <Line
                  type="monotone"
                  dataKey="weightKg"
                  name="Peso"
                  unit=" kg"
                  stroke="var(--color-accent)"
                  strokeWidth={2}
                  dot={{ r: 2, fill: "var(--color-accent)" }}
                  activeDot={{ r: 4 }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      ) : (
        <Card>
          <EmptyState
            icon={Scale}
            title="Todavía no hay pesos registrados"
            description="Registra el primero arriba y la gráfica de evolución aparecerá aquí."
          />
        </Card>
      )}
    </div>
  );
}
