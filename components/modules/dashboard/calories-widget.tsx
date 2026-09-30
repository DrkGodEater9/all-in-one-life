"use client";

import * as React from "react";
import { Salad } from "lucide-react";
import { api, ApiClientError, qs } from "@/lib/api";
import { formatNumber, toDateKey } from "@/lib/utils";
import { Progress } from "@/components/ui";
import { MACRO_BAR, type Summary } from "@/components/modules/nutrition/types";
import { WidgetError, WidgetShell, WidgetSkeleton } from "./widget-shell";

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: Summary };

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
    <div className="space-y-1">
      <Progress value={pct(value, goal)} className="h-1.5" indicatorClassName={meta.bar} />
      <p className="text-[10px] uppercase tracking-wide text-text-3">{meta.label}</p>
    </div>
  );
}

/** Widget 2: kcal consumidas / meta, con barra de progreso de macros. */
export function CaloriesWidget() {
  const [state, setState] = React.useState<State>({ status: "loading" });

  React.useEffect(() => {
    let cancelled = false;

    // `date` se manda explícito (hoy en hora local del navegador) porque el
    // default del endpoint —`todayKey()` en app/api/nutrition/_shared.ts—
    // calcula "hoy" con la fecha UTC del servidor. En Colombia (UTC-5) eso
    // adelanta el día varias horas antes de la medianoche local; ver nota en
    // el reporte final. Pasar `date` explícito evita el problema aquí.
    api
      .get<Summary>(`/nutrition/summary${qs({ date: toDateKey() })}`)
      .then((data) => {
        if (!cancelled) setState({ status: "ready", data });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setState({
          status: "error",
          message:
            error instanceof ApiClientError ? error.message : "No se pudieron cargar las calorías",
        });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <WidgetShell href="/nutrition" title="Calorías" icon={Salad}>
      {state.status === "loading" && <WidgetSkeleton />}
      {state.status === "error" && <WidgetError message={state.message} />}
      {state.status === "ready" && (
        <div className="space-y-3">
          <div className="flex items-baseline gap-1.5">
            <span className="font-mono text-3xl text-text">
              {formatNumber(state.data.totals.kcal)}
            </span>
            <span className="font-mono text-sm text-text-3">
              / {formatNumber(state.data.goal.kcal)} kcal
            </span>
          </div>
          <Progress
            value={pct(state.data.totals.kcal, state.data.goal.kcal)}
            indicatorClassName={state.data.remaining.kcal < 0 ? "bg-danger" : "bg-accent"}
          />
          <div className="grid grid-cols-3 gap-3 pt-1">
            <MacroBar
              variant="protein"
              value={state.data.totals.proteinG}
              goal={state.data.goal.proteinG}
            />
            <MacroBar
              variant="carbs"
              value={state.data.totals.carbsG}
              goal={state.data.goal.carbsG}
            />
            <MacroBar variant="fat" value={state.data.totals.fatG} goal={state.data.goal.fatG} />
          </div>
        </div>
      )}
    </WidgetShell>
  );
}
