"use client";

import * as React from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import {
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toast,
} from "@/components/ui";
import { api, ApiClientError } from "@/lib/api";
import {
  EXERCISE_TYPES,
  EXERCISE_TYPE_LABEL,
  type ExerciseType,
  type Routine,
} from "@/components/modules/gym/types";

const schema = z.object({
  name: z.string().trim().min(1, "Ponle un nombre a la rutina").max(120),
  exercises: z
    .array(
      z.object({
        name: z.string().trim().min(1, "El ejercicio necesita un nombre").max(120),
        type: z.enum(["weight", "bodyweight", "cardio"]),
      })
    )
    .min(1, "Agrega al menos un ejercicio"),
});

type FormValues = z.infer<typeof schema>;

export interface RoutineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  routine?: Routine | null;
  onSaved: (routine: Routine) => void;
}

export function RoutineDialog({
  open,
  onOpenChange,
  routine,
  onSaved,
}: RoutineDialogProps) {
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", exercises: [{ name: "", type: "weight" }] },
  });

  const { fields, append, remove, move } = useFieldArray({ control, name: "exercises" });

  React.useEffect(() => {
    if (!open) return;
    reset(
      routine
        ? {
            name: routine.name,
            exercises: routine.exercises.map((exercise) => ({
              name: exercise.name,
              type: exercise.type,
            })),
          }
        : { name: "", exercises: [{ name: "", type: "weight" }] }
    );
  }, [open, routine, reset]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      const saved = routine
        ? await api.put<Routine>(`/gym/routines/${routine.id}`, values)
        : await api.post<Routine>("/gym/routines", values);
      toast({
        title: routine ? "Rutina actualizada" : "Rutina creada",
        description: saved.name,
      });
      onSaved(saved);
      onOpenChange(false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "No se pudo guardar",
        description:
          error instanceof ApiClientError ? error.message : "Intenta de nuevo",
      });
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{routine ? "Editar rutina" : "Nueva rutina"}</DialogTitle>
          <DialogDescription>
            Define los ejercicios y su orden: es el orden que verás durante el entreno.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit}>
          <DialogBody className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="routine-name">Nombre</Label>
              <Input
                id="routine-name"
                placeholder="Empuje A"
                autoComplete="off"
                {...register("name")}
              />
              {errors.name ? (
                <p className="text-xs text-danger">{errors.name.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Ejercicios</Label>
                <span className="font-mono text-xs text-text-3">{fields.length}</span>
              </div>

              <ul className="space-y-2">
                {fields.map((field, index) => (
                  <li
                    key={field.id}
                    className="rounded-md border border-border bg-surface-2 p-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-5 shrink-0 text-center font-mono text-xs text-text-3">
                        {index + 1}
                      </span>
                      <Input
                        className="h-9 flex-1 bg-surface"
                        placeholder="Press banca"
                        autoComplete="off"
                        aria-label={`Nombre del ejercicio ${index + 1}`}
                        {...register(`exercises.${index}.name` as const)}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Quitar ejercicio"
                        onClick={() => remove(index)}
                      >
                        <Trash2 />
                      </Button>
                    </div>

                    <div className="mt-2 flex items-center gap-2 pl-7">
                      <Controller
                        control={control}
                        name={`exercises.${index}.type` as const}
                        render={({ field: typeField }) => (
                          <Select
                            value={typeField.value}
                            onValueChange={(value) =>
                              typeField.onChange(value as ExerciseType)
                            }
                          >
                            <SelectTrigger
                              className="h-8 flex-1 bg-surface text-xs"
                              aria-label={`Tipo del ejercicio ${index + 1}`}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {EXERCISE_TYPES.map((type) => (
                                <SelectItem key={type} value={type}>
                                  {EXERCISE_TYPE_LABEL[type]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        aria-label="Subir ejercicio"
                        disabled={index === 0}
                        onClick={() => move(index, index - 1)}
                      >
                        <ArrowUp />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        aria-label="Bajar ejercicio"
                        disabled={index === fields.length - 1}
                        onClick={() => move(index, index + 1)}
                      >
                        <ArrowDown />
                      </Button>
                    </div>

                    {errors.exercises?.[index]?.name ? (
                      <p className="mt-1 pl-7 text-xs text-danger">
                        {errors.exercises[index]?.name?.message}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>

              {errors.exercises?.message ? (
                <p className="text-xs text-danger">{errors.exercises.message}</p>
              ) : null}

              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="w-full"
                onClick={() => append({ name: "", type: "weight" })}
              >
                <Plus />
                Agregar ejercicio
              </Button>
            </div>
          </DialogBody>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Guardando..." : "Guardar rutina"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
