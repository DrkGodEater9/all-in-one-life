"use client";

import * as React from "react";
import { Droplet } from "lucide-react";
import { Button, Card, SectionHeader, Skeleton, toast } from "@/components/ui";
import { api } from "@/lib/api";
import { formatNumber } from "@/lib/utils";
import type { WaterDay } from "./types";

const QUICK_ADDS = [
  { label: "+250 ml", amountMl: 250 },
  { label: "+500 ml", amountMl: 500 },
  { label: "+1 L", amountMl: 1000 },
];

const SIZE = 180;
const STROKE = 12;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function WaterRing({ totalMl, goalMl }: { totalMl: number; goalMl: number }) {
  const ratio = goalMl > 0 ? Math.min(1, totalMl / goalMl) : 0;
  const pct = Math.round(ratio * 100);

  return (
    <div
      className="relative"
      style={{ width: SIZE, height: SIZE }}
      role="img"
      aria-label={`${totalMl} de ${goalMl} mililitros, ${pct}%`}
    >
      <svg width={SIZE} height={SIZE} className="-rotate-90">
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="var(--color-surface-2)"
          strokeWidth={STROKE}
        />
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - ratio)}
          style={{ transition: "stroke-dashoffset 150ms ease-out" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-2xl text-text">
          {formatNumber(totalMl)}
        </span>
        <span className="font-mono text-xs text-text-3">
          / {formatNumber(goalMl)} ml
        </span>
        <span className="mt-1 text-[11px] uppercase tracking-wide text-text-2">
          {pct}%
        </span>
      </div>
    </div>
  );
}

export function WaterTab({
  date,
  water,
  loading,
  onChanged,
}: {
  date: string;
  water: WaterDay | null;
  loading: boolean;
  onChanged: () => void;
}) {
  const [saving, setSaving] = React.useState<number | null>(null);

  async function add(amountMl: number) {
    setSaving(amountMl);
    try {
      await api.post("/nutrition/water", { amountMl, date });
      toast({ title: `+${formatNumber(amountMl)} ml registrados` });
      onChanged();
    } catch (error) {
      toast({
        title: "No se pudo registrar el agua",
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      });
    } finally {
      setSaving(null);
    }
  }

  if (loading || !water) {
    return <Skeleton className="h-80 w-full" />;
  }

  return (
    <div className="space-y-3">
      <Card className="p-4">
        <SectionHeader
          title="Hidratación de hoy"
          description={
            water.totalMl >= water.goalMl
              ? "Objetivo cumplido."
              : `Te faltan ${formatNumber(water.goalMl - water.totalMl)} ml.`
          }
        />

        <div className="mt-5 flex flex-col items-center gap-6">
          <WaterRing totalMl={water.totalMl} goalMl={water.goalMl} />

          <div className="grid w-full max-w-sm grid-cols-3 gap-2">
            {QUICK_ADDS.map((q) => (
              <Button
                key={q.amountMl}
                variant="secondary"
                onClick={() => void add(q.amountMl)}
                disabled={saving !== null}
              >
                <Droplet />
                {q.label}
              </Button>
            ))}
          </div>
        </div>
      </Card>

      {water.logs.length > 0 ? (
        <Card className="p-4">
          <SectionHeader
            title="Registros del día"
            description={`${water.logs.length} ${water.logs.length === 1 ? "toma" : "tomas"}`}
          />
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {water.logs.map((l) => (
              <li
                key={l.id}
                className="rounded-sm border border-border px-2 py-1 font-mono text-xs text-text-2"
              >
                {formatNumber(l.amountMl)} ml
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}
