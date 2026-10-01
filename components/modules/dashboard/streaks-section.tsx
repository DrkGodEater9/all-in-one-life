"use client";

import * as React from "react";
import { Check, Flame, Plus, Trash2 } from "lucide-react";
import { api, ApiClientError } from "@/lib/api";
import { cn, toDateKey } from "@/lib/utils";
import { Button, Card, EmptyState, Skeleton, toast } from "@/components/ui";
import { StreakDialog } from "./streak-dialog";
import type { Streak } from "./streak-types";

const STATUS_LABEL: Record<Streak["status"], string> = {
  done: "Cumplida hoy",
  due: "Toca hoy",
  rest: "Día de descanso",
  lost: "Perdida, empieza de nuevo",
  new: "Sin empezar",
};

/** Rachas debajo del dashboard: se crean aquí y cuentan día a día. */
export function StreaksSection() {
  const [streaks, setStreaks] = React.useState<Streak[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [busyId, setBusyId] = React.useState<number | null>(null);

  React.useEffect(() => {
    api
      .get<Streak[]>(`/streaks?today=${toDateKey()}`)
      .then((data) => {
        setStreaks(data);
        setError(null);
      })
      .catch((err: unknown) =>
        setError(err instanceof ApiClientError ? err.message : "No se pudieron cargar las rachas")
      );
  }, []);

  async function toggle(streak: Streak) {
    setBusyId(streak.id);
    try {
      const updated = await api.put<Streak>(`/streaks/${streak.id}/checkin`, {
        date: toDateKey(),
        done: !streak.doneToday,
      });
      setStreaks((list) => list?.map((s) => (s.id === updated.id ? updated : s)) ?? list);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "No se pudo actualizar la racha",
        description: err instanceof ApiClientError ? err.message : "Inténtalo de nuevo",
      });
    } finally {
      setBusyId(null);
    }
  }

  async function remove(streak: Streak) {
    if (!window.confirm(`¿Eliminar la racha "${streak.name}"? Se borra todo su historial.`)) return;
    try {
      await api.delete(`/streaks/${streak.id}`);
      setStreaks((list) => list?.filter((s) => s.id !== streak.id) ?? list);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "No se pudo eliminar",
        description: err instanceof ApiClientError ? err.message : "Inténtalo de nuevo",
      });
    }
  }

  return (
    <section className="mt-6 space-y-3" aria-labelledby="streaks-title">
      <div className="flex items-center justify-between">
        <h2 id="streaks-title" className="flex items-center gap-2 text-sm font-medium text-text">
          <Flame className="h-4 w-4 text-text-2" strokeWidth={1.75} aria-hidden />
          Rachas
        </h2>
        <Button type="button" size="sm" variant="ghost" onClick={() => setCreating(true)}>
          <Plus className="mr-1 h-4 w-4" />
          Nueva racha
        </Button>
      </div>

      {error ? (
        <p className="text-xs text-danger">{error}</p>
      ) : streaks === null ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : streaks.length === 0 ? (
        <EmptyState
          icon={Flame}
          title="Aún no tienes rachas"
          description="Crea una para llevar la cuenta de un hábito: gym, leer, lo que quieras."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {streaks.map((s) => (
            <Card key={s.id} className="group relative overflow-hidden p-4">
              <span
                className="absolute inset-y-0 left-0 w-1"
                style={{ backgroundColor: s.color }}
                aria-hidden
              />
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-text">{s.name}</p>
                  <p className="text-[11px] text-text-3">
                    {s.mode === "daily" ? "Diaria" : "Día sí, día no"}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label={`Eliminar racha ${s.name}`}
                  onClick={() => remove(s)}
                  className="text-text-3 opacity-0 transition-opacity hover:text-danger focus-visible:opacity-100 group-hover:opacity-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="mt-3 flex items-end gap-2">
                <Flame
                  className={cn("h-7 w-7", s.current === 0 && "opacity-30")}
                  style={{ color: s.color }}
                  aria-hidden
                />
                <p className="font-mono text-3xl leading-none tabular-nums text-text">
                  {s.current}
                </p>
                <p className="pb-0.5 text-xs text-text-3">
                  {s.current === 1 ? "cumplimiento" : "cumplimientos"} · mejor {s.best}
                </p>
              </div>

              <div className="mt-3 flex items-center justify-between gap-2">
                <span
                  className={cn(
                    "text-xs",
                    s.status === "due" && "text-warning",
                    s.status === "lost" && "text-danger",
                    s.status === "done" && "text-success",
                    (s.status === "rest" || s.status === "new") && "text-text-3"
                  )}
                >
                  {STATUS_LABEL[s.status]}
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant={s.doneToday ? "secondary" : "default"}
                  disabled={busyId === s.id}
                  onClick={() => toggle(s)}
                >
                  <Check className="mr-1 h-3.5 w-3.5" />
                  {s.doneToday ? "Deshacer" : "Hecho hoy"}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <StreakDialog
        open={creating}
        onOpenChange={setCreating}
        onCreated={(s) => setStreaks((list) => [...(list ?? []), s])}
      />
    </section>
  );
}
