"use client";

import * as React from "react";
import Link from "next/link";
import { CalendarDays, ChevronRight } from "lucide-react";
import { Badge, EmptyState, SectionHeader, Skeleton, toast } from "@/components/ui";
import { api, ApiClientError } from "@/lib/api";
import {
  formatAmount,
  formatDate,
  formatDuration,
  type WorkoutSummary,
} from "@/components/modules/gym/types";

export function WorkoutsTab() {
  const [workouts, setWorkouts] = React.useState<WorkoutSummary[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await api.get<WorkoutSummary[]>("/gym/workouts");
        if (active) setWorkouts(data);
      } catch (error) {
        if (active) {
          toast({
            variant: "destructive",
            title: "No se pudo cargar el historial",
            description:
              error instanceof ApiClientError ? error.message : "Intenta de nuevo",
          });
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Entrenos"
        description="Historial de sesiones registradas."
      />

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((key) => (
            <Skeleton key={key} className="h-16 w-full" />
          ))}
        </div>
      ) : workouts.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="Sin entrenos todavía"
          description="Inicia un entreno desde la pestaña Rutinas y aparecerá aquí."
        />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
          {workouts.map((workout) => (
            <li key={workout.id}>
              <Link
                href={`/gym/workout/${workout.id}`}
                className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-text">
                      {workout.routineName}
                    </span>
                    {!workout.finishedAt ? (
                      <Badge variant="warning">En curso</Badge>
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-xs text-text-2">
                    {formatDate(workout.date)} · {formatDuration(workout.durationSecs)} ·{" "}
                    <span className="font-mono">{workout.setCount}</span>{" "}
                    {workout.setCount === 1 ? "serie" : "series"}
                  </p>
                </div>

                <div className="shrink-0 text-right">
                  <p className="font-mono text-sm tabular-nums text-text">
                    {formatAmount(workout.totalVolume)}
                  </p>
                  <p className="text-[11px] text-text-3">kg vol.</p>
                </div>

                <ChevronRight className="h-4 w-4 shrink-0 text-text-3" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
