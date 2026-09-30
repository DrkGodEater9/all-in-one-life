"use client";

import * as React from "react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Dumbbell } from "lucide-react";
import { api, ApiClientError, qs } from "@/lib/api";
import { formatNumber } from "@/lib/utils";
import { EmptyState } from "@/components/ui";
import type { WorkoutSummary } from "@/components/modules/gym/types";
import { WidgetError, WidgetShell, WidgetSkeleton } from "./widget-shell";

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: WorkoutSummary | null };

/** Widget 5: fecha, rutina y volumen total del último entreno registrado. */
export function LastWorkoutWidget() {
  const [state, setState] = React.useState<State>({ status: "loading" });

  React.useEffect(() => {
    let cancelled = false;

    api
      .get<WorkoutSummary[]>(`/gym/workouts${qs({ limit: 1 })}`)
      .then((workouts) => {
        if (!cancelled) setState({ status: "ready", data: workouts[0] ?? null });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setState({
          status: "error",
          message:
            error instanceof ApiClientError
              ? error.message
              : "No se pudo cargar el último entreno",
        });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <WidgetShell href="/gym" title="Último entreno" icon={Dumbbell}>
      {state.status === "loading" && <WidgetSkeleton />}
      {state.status === "error" && <WidgetError message={state.message} />}
      {state.status === "ready" &&
        (state.data === null ? (
          <EmptyState title="Todavía no hay entrenos registrados" className="py-4" />
        ) : (
          <div className="space-y-3">
            <div>
              <p className="text-sm text-text">{state.data.routineName}</p>
              <p className="text-xs text-text-2">
                {format(parseISO(state.data.date), "d 'de' MMMM", { locale: es })}
              </p>
            </div>
            <p className="font-mono text-2xl text-text">
              {formatNumber(state.data.totalVolume)}
              <span className="ml-1 text-xs text-text-3">kg volumen total</span>
            </p>
          </div>
        ))}
    </WidgetShell>
  );
}
