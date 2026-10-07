"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus } from "lucide-react";
import { Button, Input, Label, toast } from "@/components/ui";
import { api, ApiClientError } from "@/lib/api";
import { sanitizeDecimal, sanitizeInteger } from "@/components/modules/gym/numeric";
import type { ExerciseType, WorkoutSet } from "@/components/modules/gym/types";

/** Controles grandes: esta pantalla se usa con el teléfono en la mano. */
const inputClass = "h-12 font-mono text-base tabular-nums";

const toNumber = (value: string) => Number(value.trim().replace(",", "."));

const requiredPositive = (message: string, max = 999) =>
  z
    .string()
    .trim()
    .min(1, "Requerido")
    .refine(
      (value) =>
        Number.isFinite(toNumber(value)) && toNumber(value) > 0 && toNumber(value) <= max,
      message
    );

const requiredNonNegative = (message: string, max = 1000) =>
  z
    .string()
    .trim()
    .min(1, "Requerido")
    .refine(
      (value) =>
        Number.isFinite(toNumber(value)) && toNumber(value) >= 0 && toNumber(value) <= max,
      message
    );

const optionalNonNegative = (message: string, max = 9999) =>
  z
    .string()
    .trim()
    .refine(
      (value) => value === "" ||
        (Number.isFinite(toNumber(value)) && toNumber(value) >= 0 && toNumber(value) <= max),
      message
    );

export interface AddSetFormProps {
  workoutId: number;
  exerciseName: string;
  exerciseType: ExerciseType;
  lastSet?: WorkoutSet;
  onAdded: (set: WorkoutSet) => void;
}

export function AddSetForm(props: AddSetFormProps) {
  if (props.exerciseType === "cardio") return <CardioSetForm {...props} />;
  if (props.exerciseType === "bodyweight") return <BodyweightSetForm {...props} />;
  return <WeightSetForm {...props} />;
}

function useSubmitSet(
  workoutId: number,
  onAdded: (set: WorkoutSet) => void
) {
  return React.useCallback(
    async (payload: Record<string, unknown>) => {
      try {
        const set = await api.post<WorkoutSet>(
          `/gym/workouts/${workoutId}/sets`,
          payload
        );
        onAdded(set);
        return true;
      } catch (error) {
        toast({
          variant: "destructive",
          title: "No se pudo registrar la serie",
          description:
            error instanceof ApiClientError ? error.message : "Intenta de nuevo",
        });
        return false;
      }
    },
    [workoutId, onAdded]
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-danger">{message}</p>;
}

// ── weight: reps + kg ────────────────────────────────────────────

const weightSchema = z.object({
  weightKg: requiredNonNegative("Peso inválido (0 a 1000 kg)"),
  reps: requiredPositive("Reps inválidas (1 a 999)"),
});
type WeightValues = z.infer<typeof weightSchema>;

function WeightSetForm({
  workoutId,
  exerciseName,
  lastSet,
  onAdded,
}: AddSetFormProps) {
  const submitSet = useSubmitSet(workoutId, onAdded);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<WeightValues>({
    resolver: zodResolver(weightSchema),
    defaultValues: {
      weightKg: lastSet?.weightKg != null ? String(lastSet.weightKg) : "",
      reps: lastSet?.reps != null ? String(lastSet.reps) : "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    await submitSet({
      exerciseName,
      exerciseType: "weight",
      weightKg: toNumber(values.weightKg),
      reps: Math.round(toNumber(values.reps)),
    });
  });

  return (
    <form onSubmit={onSubmit} className="flex items-end gap-2">
      <div className="min-w-0 flex-1">
        <Label htmlFor={`kg-${exerciseName}`} className="text-[11px] text-text-3">
          kg
        </Label>
        <Input
          id={`kg-${exerciseName}`}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          className={inputClass}
          {...register("weightKg", { onChange: (e) => { e.target.value = sanitizeDecimal(e.target.value, 2, 4); } })}
        />
        <FieldError message={errors.weightKg?.message} />
      </div>
      <div className="min-w-0 flex-1">
        <Label htmlFor={`reps-${exerciseName}`} className="text-[11px] text-text-3">
          reps
        </Label>
        <Input
          id={`reps-${exerciseName}`}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          className={inputClass}
          {...register("reps", { onChange: (e) => { e.target.value = sanitizeInteger(e.target.value, 3); } })}
        />
        <FieldError message={errors.reps?.message} />
      </div>
      <Button type="submit" size="lg" className="shrink-0" disabled={isSubmitting}>
        <Plus />
        Serie
      </Button>
    </form>
  );
}

// ── bodyweight: reps ─────────────────────────────────────────────

const bodyweightSchema = z.object({ reps: requiredPositive("Reps inválidas (1 a 999)") });
type BodyweightValues = z.infer<typeof bodyweightSchema>;

function BodyweightSetForm({
  workoutId,
  exerciseName,
  lastSet,
  onAdded,
}: AddSetFormProps) {
  const submitSet = useSubmitSet(workoutId, onAdded);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<BodyweightValues>({
    resolver: zodResolver(bodyweightSchema),
    defaultValues: { reps: lastSet?.reps != null ? String(lastSet.reps) : "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    await submitSet({
      exerciseName,
      exerciseType: "bodyweight",
      reps: Math.round(toNumber(values.reps)),
    });
  });

  return (
    <form onSubmit={onSubmit} className="flex items-end gap-2">
      <div className="min-w-0 flex-1">
        <Label htmlFor={`reps-${exerciseName}`} className="text-[11px] text-text-3">
          reps
        </Label>
        <Input
          id={`reps-${exerciseName}`}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          className={inputClass}
          {...register("reps", { onChange: (e) => { e.target.value = sanitizeInteger(e.target.value, 3); } })}
        />
        <FieldError message={errors.reps?.message} />
      </div>
      <Button type="submit" size="lg" className="shrink-0" disabled={isSubmitting}>
        <Plus />
        Serie
      </Button>
    </form>
  );
}

// ── cardio: duración + distancia ─────────────────────────────────

const cardioSchema = z
  .object({
    minutes: optionalNonNegative("Minutos inválidos"),
    seconds: optionalNonNegative("Segundos inválidos (0 a 59)", 59),
    distanceKm: optionalNonNegative("Distancia inválida (máx. 999 km)", 999),
  })
  .refine(
    (values) =>
      toNumber(values.minutes || "0") * 60 + toNumber(values.seconds || "0") > 0,
    { message: "Indica la duración", path: ["minutes"] }
  );
type CardioValues = z.infer<typeof cardioSchema>;

function CardioSetForm({
  workoutId,
  exerciseName,
  lastSet,
  onAdded,
}: AddSetFormProps) {
  const submitSet = useSubmitSet(workoutId, onAdded);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CardioValues>({
    resolver: zodResolver(cardioSchema),
    defaultValues: {
      minutes:
        lastSet?.durationSecs != null ? String(Math.floor(lastSet.durationSecs / 60)) : "",
      seconds:
        lastSet?.durationSecs != null ? String(lastSet.durationSecs % 60) : "",
      distanceKm: lastSet?.distanceKm != null ? String(lastSet.distanceKm) : "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    const durationSecs =
      Math.round(toNumber(values.minutes || "0")) * 60 +
      Math.round(toNumber(values.seconds || "0"));

    await submitSet({
      exerciseName,
      exerciseType: "cardio",
      durationSecs,
      distanceKm:
        values.distanceKm.trim() === "" ? null : toNumber(values.distanceKm),
    });
  });

  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <div className="grid grid-cols-3 gap-2">
        <div>
          <Label htmlFor={`min-${exerciseName}`} className="text-[11px] text-text-3">
            min
          </Label>
          <Input
            id={`min-${exerciseName}`}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            className={inputClass}
            {...register("minutes", { onChange: (e) => { e.target.value = sanitizeInteger(e.target.value, 4); } })}
          />
        </div>
        <div>
          <Label htmlFor={`sec-${exerciseName}`} className="text-[11px] text-text-3">
            seg
          </Label>
          <Input
            id={`sec-${exerciseName}`}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            className={inputClass}
            {...register("seconds", { onChange: (e) => { e.target.value = sanitizeInteger(e.target.value, 2); } })}
          />
        </div>
        <div>
          <Label htmlFor={`km-${exerciseName}`} className="text-[11px] text-text-3">
            km
          </Label>
          <Input
            id={`km-${exerciseName}`}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            className={inputClass}
            {...register("distanceKm", { onChange: (e) => { e.target.value = sanitizeDecimal(e.target.value, 2, 3); } })}
          />
        </div>
      </div>
      <FieldError
        message={
          errors.minutes?.message ??
          errors.seconds?.message ??
          errors.distanceKm?.message
        }
      />
      <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
        <Plus />
        Serie
      </Button>
    </form>
  );
}
