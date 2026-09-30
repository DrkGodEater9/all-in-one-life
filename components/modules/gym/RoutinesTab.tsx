"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Dumbbell, Pencil, Play, Plus, Trash2 } from "lucide-react";
import {
  Badge,
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  SectionHeader,
  Skeleton,
  toast,
} from "@/components/ui";
import { api, ApiClientError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { RoutineDialog } from "@/components/modules/gym/RoutineDialog";
import {
  EXERCISE_TYPE_LABEL,
  todayKey,
  type Routine,
  type WorkoutDetail,
} from "@/components/modules/gym/types";

export interface RoutinesTabProps {
  routines: Routine[];
  loading: boolean;
  onChanged: () => void;
}

export function RoutinesTab({ routines, loading, onChanged }: RoutinesTabProps) {
  const router = useRouter();
  const [expanded, setExpanded] = React.useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Routine | null>(null);
  const [pendingDelete, setPendingDelete] = React.useState<Routine | null>(null);
  const [starting, setStarting] = React.useState<number | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  function openNew() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(routine: Routine) {
    setEditing(routine);
    setDialogOpen(true);
  }

  async function startWorkout(routine: Routine) {
    if (!routine.exercises.length) {
      toast({
        variant: "destructive",
        title: "Rutina sin ejercicios",
        description: "Agrega ejercicios antes de entrenar.",
      });
      return;
    }
    setStarting(routine.id);
    try {
      const workout = await api.post<WorkoutDetail>("/gym/workouts", {
        routineId: routine.id,
        date: todayKey(),
      });
      router.push(`/gym/workout/${workout.id}`);
    } catch (error) {
      setStarting(null);
      toast({
        variant: "destructive",
        title: "No se pudo iniciar el entreno",
        description:
          error instanceof ApiClientError ? error.message : "Intenta de nuevo",
      });
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/gym/routines/${pendingDelete.id}`);
      toast({ title: "Rutina eliminada", description: pendingDelete.name });
      setPendingDelete(null);
      onChanged();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "No se pudo eliminar",
        description:
          error instanceof ApiClientError ? error.message : "Intenta de nuevo",
      });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Rutinas"
        description="Tus plantillas de entreno."
        action={
          <Button size="sm" onClick={openNew} aria-label="Nueva rutina">
            <Plus />
            Nueva
          </Button>
        }
      />

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((key) => (
            <Skeleton key={key} className="h-20 w-full" />
          ))}
        </div>
      ) : routines.length === 0 ? (
        <EmptyState
          icon={Dumbbell}
          title="Todavía no tienes rutinas"
          description="Crea una rutina con sus ejercicios para empezar a registrar entrenos."
          action={
            <Button size="sm" onClick={openNew}>
              <Plus />
              Nueva rutina
            </Button>
          }
        />
      ) : (
        <ul className="space-y-2">
          {routines.map((routine) => {
            const open = expanded === routine.id;
            return (
              <li
                key={routine.id}
                className="rounded-lg border border-border bg-surface"
              >
                <div className="flex items-start gap-2 p-4">
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => setExpanded(open ? null : routine.id)}
                    aria-expanded={open}
                  >
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium text-text">
                        {routine.name}
                      </span>
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 shrink-0 text-text-3 transition-transform duration-150",
                          open && "rotate-180"
                        )}
                      />
                    </div>
                    <p className="mt-0.5 text-xs text-text-2">
                      <span className="font-mono">{routine.exerciseCount}</span>{" "}
                      {routine.exerciseCount === 1 ? "ejercicio" : "ejercicios"}
                      {routine.workoutCount > 0 ? (
                        <>
                          {" · "}
                          <span className="font-mono">{routine.workoutCount}</span>{" "}
                          {routine.workoutCount === 1 ? "entreno" : "entrenos"}
                        </>
                      ) : null}
                    </p>
                  </button>

                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Editar ${routine.name}`}
                      onClick={() => openEdit(routine)}
                    >
                      <Pencil />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Eliminar ${routine.name}`}
                      onClick={() => setPendingDelete(routine)}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </div>

                {open ? (
                  <div className="border-t border-border px-4 py-3">
                    {routine.exercises.length ? (
                      <ul className="space-y-1.5">
                        {routine.exercises.map((exercise, index) => (
                          <li
                            key={exercise.id}
                            className="flex items-center justify-between gap-3"
                          >
                            <span className="flex min-w-0 items-center gap-2">
                              <span className="w-4 shrink-0 font-mono text-xs text-text-3">
                                {index + 1}
                              </span>
                              <span className="truncate text-sm text-text">
                                {exercise.name}
                              </span>
                            </span>
                            <Badge variant="outline" className="shrink-0">
                              {EXERCISE_TYPE_LABEL[exercise.type]}
                            </Badge>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-text-3">
                        Esta rutina no tiene ejercicios.
                      </p>
                    )}
                  </div>
                ) : null}

                <div className="border-t border-border p-3">
                  <Button
                    className="w-full sm:w-auto"
                    size="sm"
                    disabled={starting === routine.id}
                    onClick={() => startWorkout(routine)}
                  >
                    <Play />
                    {starting === routine.id ? "Iniciando..." : "Iniciar entreno"}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <RoutineDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        routine={editing}
        onSaved={() => onChanged()}
      />

      <Dialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Eliminar rutina</DialogTitle>
            <DialogDescription>Esta acción no se puede deshacer.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <p className="text-sm text-text-2">
              Se eliminará <span className="text-text">{pendingDelete?.name}</span>
              {pendingDelete && pendingDelete.workoutCount > 0 ? (
                <>
                  {" y sus "}
                  <span className="font-mono text-text">
                    {pendingDelete.workoutCount}
                  </span>
                  {" entrenos registrados."}
                </>
              ) : (
                "."
              )}
            </p>
          </DialogBody>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setPendingDelete(null)}
              disabled={deleting}
            >
              Cancelar
            </Button>
            <Button variant="danger" onClick={confirmDelete} disabled={deleting}>
              {deleting ? "Eliminando..." : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
