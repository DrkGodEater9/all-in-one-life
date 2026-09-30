"use client";

import { Flame } from "lucide-react";
import { Card, Progress, Skeleton, Stat } from "@/components/ui";
import { formatNumber } from "@/lib/utils";
import { MACRO_BAR, type Streak, type Summary } from "./types";

function pct(value: number, goal: number) {
  if (!goal || goal <= 0) return 0;
  return Math.min(100, Math.round((value / goal) * 100));
}

function MacroBar({
  variant,
  value,
  goal,
}: {
  variant: keyof typeof MACRO_BAR;
  value: number;
  goal: number;
}) {
  const meta = MACRO_BAR[variant];
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs text-text-2">{meta.label}</span>
        <span className="font-mono text-xs text-text">
          {formatNumber(value)}
          <span className="text-text-3"> / {formatNumber(goal)} g</span>
        </span>
      </div>
      <Progress value={pct(value, goal)} indicatorClassName={meta.bar} />
    </div>
  );
}

export function NutritionHeader({
  summary,
  streak,
  loading,
}: {
  summary: Summary | null;
  streak: Streak | null;
  loading: boolean;
}) {
  if (loading || !summary) {
    return (
      <Card className="p-5">
        <Skeleton className="h-12 w-48" />
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </Card>
    );
  }

  const { totals, goal, remaining } = summary;
  const kcalPct = pct(totals.kcal, goal.kcal);
  const over = remaining.kcal < 0;

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <Stat
          label="Calorías de hoy"
          value={
            <span className="font-mono">
              {formatNumber(totals.kcal)}
              <span className="text-text-3"> / {formatNumber(goal.kcal)}</span>
            </span>
          }
          sub={
            over
              ? `${formatNumber(Math.abs(remaining.kcal))} kcal por encima de la meta`
              : `Te quedan ${formatNumber(remaining.kcal)} kcal`
          }
          valueClassName="text-[2rem] sm:text-[2.5rem]"
        />

        {streak ? (
          <div className="flex items-center gap-1.5 rounded-md border border-border bg-surface-2 px-2.5 py-1.5">
            <Flame
              className={`h-4 w-4 ${streak.streak > 0 ? "text-yellow" : "text-text-3"}`}
              strokeWidth={1.75}
            />
            <span className="text-xs text-text-2">
              {streak.streak > 0 ? (
                <>
                  <span className="font-mono text-text">{streak.streak}</span>{" "}
                  {streak.streak === 1 ? "día seguido" : "días seguidos"}
                </>
              ) : (
                "Sin racha todavía"
              )}
            </span>
          </div>
        ) : null}
      </div>

      <div className="mt-4">
        <Progress
          value={kcalPct}
          indicatorClassName={over ? "bg-danger" : "bg-accent"}
        />
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <MacroBar variant="protein" value={totals.proteinG} goal={goal.proteinG} />
        <MacroBar variant="carbs" value={totals.carbsG} goal={goal.carbsG} />
        <MacroBar variant="fat" value={totals.fatG} goal={goal.fatG} />
      </div>
    </Card>
  );
}
