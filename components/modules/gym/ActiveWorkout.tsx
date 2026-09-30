"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Dumbbell, Flag, Trash2 } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  Skeleton,
  toast,
} from "@/components/ui";
import { api, ApiClientError } from "@/lib/api";
import { AddSetForm } from "@/components/modules/gym/AddSetForm";
import {
  EXERCISE_TYPE_LABEL,
  formatAmount,
  formatClock,
  formatDate,
  formatDuration,
  formatKg,
  type ExerciseType,
  type WorkoutDetail,
  type WorkoutSet,
} from "@/components/modules/gym/types";

export interface ActiveWorkoutProps {
  workoutId: number;
}

export function ActiveWorkout({ workoutId }: ActiveWorkoutProps) {
  const router = useRouter();
  const [workout, setWorkout] = React.useState<WorkoutDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [notFound, setNotFound] = React.useState(false);
  const [finishing, setFinishing] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      const data = await api.get<WorkoutDetail>(`/gym/workouts/${workoutId}`);
      setWorkout(data);
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 404) {
        setNotFound(true);
      } else {
        toast({
          variant: "destructive",
          title: "No se pudo cargar el entreno",
          description:
            error instanceof ApiClientError ? error.message : "Intenta de nuevo",
        });
      }
    } finally {
      setLoading(false);
    }
  }, [workoutId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  function handleSetAdded(set: WorkoutSet) {
    setWorkout((current) =>
      current ? { ...current, sets: [...current.sets, set] } : current
    );
  }

  async function handleDeleteSet(set: WorkoutSet) {
    const previous = workout;
    setWorkout((current) =>
      current
        ? { ...current, sets: current.sets.filter((item) => item.id !== set.id) }
        : current
    );
    try {
      await api.delete(`/gym/workouts/${workoutId}/sets/${set.id}`);
      // El servidor renumera las series restantes: recargamos para reflejarlo.
      await load();
    } catch (error) {
      setWorkout(previous);
      toast({
        variant: "destructive",
        title: "No se pudo borrar la serie",
        description:
          error instanceof ApiClientError ? error.message : "Intenta de nuevo",
      });
    }
  }

  async function handleFinish() {
    setFinishing(true);
    try {
      const finished = await api.put<WorkoutDetail>(
        `/gym/workouts/${workoutId}/finish`
      );
      setWorkout(finished);
      toast({
        title: "Entreno terminado",
        description: `${formatDuration(finished.durationSecs)} · ${formatAmount(
          finished.totalVolume
        )} kg de volumen`,
      });
      router.push("/gym");
    } catch (error) {
      toast({
        variant: "destructive",
        title: "No se pudo terminar el entreno",
        description:
          error instanceof ApiClientError ? error.message : "Intenta de nuevo",
      });
    } finally {
      setFinishing(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (notFound || !workout) {
    return (
      <EmptyState
        icon={Dumbbell}
        title="Este entreno no existe"
        description="Puede que lo hayas eliminado."
        action={
          <Button asChild size="sm" variant="secondary">
            <Link href="/gym">Volver a Gym</Link>
          </Button>
        }
      />
    );
  }

  // Ejercicios de la rutina + los que solo existen en las series (rutina editada).
  const extras = workout.sets
    .map((set) => ({ name: set.exerciseName, type: set.exerciseType }))
    .filter(
      (set, index, all) =>
        !workout.exercises.some((exercise) => exercise.name === set.name) &&
        all.findIndex((item) => item.name === set.name) === index
    );

  const blocks: { name: string; type: ExerciseType }[] = [
    ...workout.exercises.map((exercise) => ({
      name: exercise.name,
      type: exercise.type,
    })),
    ...extras,
  ];

  const finished = workout.finishedAt !== null;

  return (
    <div className="space-y-4 pb-24">
      <div className="rounded-lg border border-border bg-surface p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="-ml-3 mb-1 h-7 px-2 text-xs"
            >
              <Link href="/gym">
                <ArrowLeft />
                Gym
              </Link>
            </Button>
            <h2 className="truncate font-serif text-2xl leading-tight text-text">
              {workout.routineName}
            </h2>
            <p className="mt-0.5 text-xs text-text-2">{formatDate(workout.date)}</p>
          </div>

          <div className="shrink-0 text-right">
            <WorkoutTimer
              startedAt={workout.startedAt}
              finishedAt={workout.finishedAt}
            />
            <p className="text-[11px] uppercase tracking-wide text-text-3">
              {finished ? "duración" : "en curso"}
            </p>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-4 border-t border-border pt-3 text-xs text-text-2">
          <span>
            <span className="font-mono tabular-nums text-text">
              {formatAmount(workout.totalVolume)}
            </span>{" "}
            kg de volumen
          </span>
          <span>
            <span className="font-mono tabular-nums text-text">
              {workout.sets.length}
            </span>{" "}
            {workout.sets.length === 1 ? "serie" : "series"}
          </span>
          {finished ? (
            <Badge variant="success" className="ml-auto">
              <CheckCircle2 />
              Terminado
            </Badge>
          ) : null}
        </div>
      </div>

      {blocks.length === 0 ? (
        <EmptyState
          icon={Dumbbell}
          title="La rutina no tiene ejercicios"
          description="Edita la rutina para agregarlos."
        />
      ) : (
        blocks.map((block) => (
          <ExerciseBlock
            key={block.name}
            workoutId={workout.id}
            name={block.name}
            type={block.type}
            sets={workout.sets
              .filter((set) => set.exerciseName === block.name)
              .sort((a, b) => a.setNumber - b.setNumber)}
            readOnly={finished}
            onAdded={handleSetAdded}
            onDelete={handleDeleteSet}
          />
        ))
      )}

      {!finished ? (
        <div className="sticky bottom-14 z-20 -mx-4 border-t border-border bg-bg/90 px-4 py-3 backdrop-blur md:bottom-4 md:mx-0 md:rounded-lg md:border">
          <Button
            size="lg"
            className="w-full"
            onClick={handleFinish}
            disabled={finishing}
          >
            <Flag />
            {finishing ? "Terminando..." : "Terminar entreno"}
          </Button>
        </div>
      ) : (
        <Button asChild variant="secondary" size="lg" className="w-full">
          <Link href="/gym">Volver a Gym</Link>
        </Button>
      )}
    </div>
  );
}

/** Cronómetro: corre desde el inicio del entreno hasta que se termina. */
function WorkoutTimer({
  startedAt,
  finishedAt,
}: {
  startedAt: string;
  finishedAt: string | null;
}) {
  const [now, setNow] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (finishedAt) return;
    setNow(Date.now());
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [finishedAt]);

  const start = Date.parse(startedAt);
  const end = finishedAt ? Date.parse(finishedAt) : now ?? start;
  const seconds = Math.max(0, Math.floor((end - start) / 1000));

  return (
    <p className="font-mono text-2xl tabular-nums text-text" aria-live="off">
      {formatClock(seconds)}
    </p>
  );
}

function ExerciseBlock({
  workoutId,
  name,
  type,
  sets,
  readOnly,
  onAdded,
  onDelete,
}: {
  workoutId: number;
  name: string;
  type: ExerciseType;
  sets: WorkoutSet[];
  readOnly: boolean;
  onAdded: (set: WorkoutSet) => void;
  onDelete: (set: WorkoutSet) => void;
}) {
  const lastSet = sets.length ? sets[sets.length - 1] : undefined;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-3">
        <CardTitle className="truncate">{name}</CardTitle>
        <Badge variant="neutral" className="shrink-0">
          {EXERCISE_TYPE_LABEL[type]}
        </Badge>
      </CardHeader>

      <CardContent className="space-y-3">
        {sets.length === 0 ? (
          <p className="text-xs text-text-3">Sin series registradas.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-text-3">
                <th className="w-10 pb-1 font-medium">Set</th>
                {type === "cardio" ? (
                  <>
                    <th className="pb-1 text-right font-medium">Tiempo</th>
                    <th className="pb-1 text-right font-medium">km</th>
                  </>
                ) : (
                  <>
                    {type === "weight" ? (
                      <th className="pb-1 text-right font-medium">kg</th>
                    ) : null}
                    <th className="pb-1 text-right font-medium">Reps</th>
                  </>
                )}
                {!readOnly ? <th className="w-9 pb-1" /> : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sets.map((set) => (
                <tr key={set.id}>
                  <td className="py-2 font-mono text-xs tabular-nums text-text-3">
                    {set.setNumber}
                  </td>
                  {type === "cardio" ? (
                    <>
                      <td className="py-2 text-right font-mono tabular-nums text-text">
                        {formatClock(set.durationSecs ?? 0)}
                      </td>
                      <td className="py-2 text-right font-mono tabular-nums text-text">
                        {set.distanceKm !== null ? formatKg(set.distanceKm) : "—"}
                      </td>
                    </>
                  ) : (
                    <>
                      {type === "weight" ? (
                        <td className="py-2 text-right font-mono tabular-nums text-text">
                          {formatKg(set.weightKg)}
                        </td>
                      ) : null}
                      <td className="py-2 text-right font-mono tabular-nums text-text">
                        {set.reps ?? "—"}
                      </td>
                    </>
                  )}
                  {!readOnly ? (
                    <td className="py-1 text-right">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Borrar serie ${set.setNumber} de ${name}`}
                        onClick={() => onDelete(set)}
                      >
                        <Trash2 />
                      </Button>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {!readOnly ? (
          <AddSetForm
            workoutId={workoutId}
            exerciseName={name}
            exerciseType={type}
            lastSet={lastSet}
            onAdded={onAdded}
          />
        ) : null}
      </CardContent>
    </Card>
  );
}
