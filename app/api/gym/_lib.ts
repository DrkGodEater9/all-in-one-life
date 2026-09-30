import { z } from "zod";
import { Prisma } from "@prisma/client";
import { badRequest } from "@/lib/http";

// ─────────────────────────────────────────
// Tipos y utilidades compartidas del módulo Gym
// ─────────────────────────────────────────

export const EXERCISE_TYPES = ["weight", "bodyweight", "cardio"] as const;
export type ExerciseType = (typeof EXERCISE_TYPES)[number];

export const exerciseTypeSchema = z.enum(EXERCISE_TYPES);

/** 'YYYY-MM-DD' — formato único de fecha en la API. */
export const dateKeySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "La fecha debe tener formato YYYY-MM-DD");

/** 'YYYY-MM' — usado por la racha mensual. */
export const monthKeySchema = z
  .string()
  .regex(/^\d{4}-\d{2}$/, "El mes debe tener formato YYYY-MM");

/** Columna @db.Date -> 'YYYY-MM-DD' (la columna se guarda a medianoche UTC). */
export function dbDateKey(value: Date): string {
  return value.toISOString().slice(0, 10);
}

/** Decimal de Prisma -> number | null. */
export function decToNumber(value: Prisma.Decimal | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  return Number(value.toString());
}

/** Valida un parámetro de ruta numérico. */
export function parseIdParam(raw: string | string[] | undefined, label = "id"): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw badRequest(`El ${label} no es válido`);
  return id;
}

/** Decodifica el nombre de ejercicio que viaja en la URL. */
export function decodeExerciseName(raw: string | string[] | undefined): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) throw badRequest("Falta el nombre del ejercicio");
  let decoded = value;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    throw badRequest("El nombre del ejercicio no es válido");
  }
  const name = decoded.trim();
  if (!name) throw badRequest("Falta el nombre del ejercicio");
  return name;
}

// ─────────────────────────────────────────
// Schemas de body
// ─────────────────────────────────────────

export const routineExerciseSchema = z.object({
  name: z.string().trim().min(1, "El ejercicio necesita un nombre").max(120),
  type: exerciseTypeSchema,
});

export const routineBodySchema = z.object({
  name: z.string().trim().min(1, "La rutina necesita un nombre").max(120),
  exercises: z.array(routineExerciseSchema).max(50).default([]),
});

export const workoutBodySchema = z.object({
  routineId: z.number().int().positive(),
  date: dateKeySchema.optional(),
  notes: z.string().trim().max(500).optional().nullable(),
});

const setNotes = z.string().trim().max(280).optional().nullable();

/**
 * Cada tipo de ejercicio admite exactamente sus campos:
 * weight -> reps + weightKg · bodyweight -> reps · cardio -> durationSecs + distanceKm.
 * Los objetos son estrictos para rechazar combinaciones imposibles (p.ej. kg en cardio).
 */
export const workoutSetBodySchema = z.discriminatedUnion("exerciseType", [
  z
    .object({
      exerciseName: z.string().trim().min(1).max(120),
      exerciseType: z.literal("weight"),
      reps: z.number().int().positive().max(1000),
      weightKg: z.number().nonnegative().max(9999),
      notes: setNotes,
    })
    .strict(),
  z
    .object({
      exerciseName: z.string().trim().min(1).max(120),
      exerciseType: z.literal("bodyweight"),
      reps: z.number().int().positive().max(1000),
      notes: setNotes,
    })
    .strict(),
  z
    .object({
      exerciseName: z.string().trim().min(1).max(120),
      exerciseType: z.literal("cardio"),
      durationSecs: z.number().int().positive().max(86400),
      distanceKm: z.number().nonnegative().max(999).optional().nullable(),
      notes: setNotes,
    })
    .strict(),
]);

export const measurementBodySchema = z
  .object({
    date: dateKeySchema.optional(),
    chestCm: z.number().positive().max(300).optional().nullable(),
    waistCm: z.number().positive().max(300).optional().nullable(),
    hipsCm: z.number().positive().max(300).optional().nullable(),
    armsCm: z.number().positive().max(300).optional().nullable(),
    thighsCm: z.number().positive().max(300).optional().nullable(),
    notes: z.string().trim().max(500).optional().nullable(),
  })
  .refine(
    (v) =>
      [v.chestCm, v.waistCm, v.hipsCm, v.armsCm, v.thighsCm].some(
        (n) => n !== null && n !== undefined
      ),
    { message: "Registra al menos una medida" }
  );

// ─────────────────────────────────────────
// DTOs
// ─────────────────────────────────────────

type SetRow = {
  id: number;
  exerciseName: string;
  exerciseType: string;
  setNumber: number;
  reps: number | null;
  weightKg: Prisma.Decimal | null;
  durationSecs: number | null;
  distanceKm: Prisma.Decimal | null;
  notes: string | null;
};

export type WorkoutSetDTO = {
  id: number;
  exerciseName: string;
  exerciseType: ExerciseType;
  setNumber: number;
  reps: number | null;
  weightKg: number | null;
  durationSecs: number | null;
  distanceKm: number | null;
  notes: string | null;
  volume: number;
};

/** Volumen de una serie: reps × kg (0 si no aplica). */
export function setVolume(set: Pick<SetRow, "reps" | "weightKg">): number {
  const kg = decToNumber(set.weightKg);
  if (set.reps === null || kg === null) return 0;
  return set.reps * kg;
}

export function toSetDTO(set: SetRow): WorkoutSetDTO {
  return {
    id: set.id,
    exerciseName: set.exerciseName,
    exerciseType: set.exerciseType as ExerciseType,
    setNumber: set.setNumber,
    reps: set.reps,
    weightKg: decToNumber(set.weightKg),
    durationSecs: set.durationSecs,
    distanceKm: decToNumber(set.distanceKm),
    notes: set.notes,
    volume: setVolume(set),
  };
}

/** Duración en segundos de un entreno terminado (createdAt -> finishedAt). */
export function workoutDuration(workout: {
  createdAt: Date;
  finishedAt: Date | null;
}): number | null {
  if (!workout.finishedAt) return null;
  const secs = Math.round(
    (workout.finishedAt.getTime() - workout.createdAt.getTime()) / 1000
  );
  return secs > 0 ? secs : 0;
}

export const routineInclude = {
  exercises: { orderBy: { orderIndex: "asc" } },
  _count: { select: { workouts: true } },
} satisfies Prisma.GymRoutineInclude;

type RoutineRow = {
  id: number;
  name: string;
  exercises: { id: number; name: string; type: string; orderIndex: number }[];
  _count: { workouts: number };
};

export type RoutineDTO = {
  id: number;
  name: string;
  exerciseCount: number;
  workoutCount: number;
  exercises: { id: number; name: string; type: ExerciseType; orderIndex: number }[];
};

export function toRoutineDTO(routine: RoutineRow): RoutineDTO {
  return {
    id: routine.id,
    name: routine.name,
    exerciseCount: routine.exercises.length,
    workoutCount: routine._count.workouts,
    exercises: routine.exercises.map((exercise) => ({
      id: exercise.id,
      name: exercise.name,
      type: exercise.type as ExerciseType,
      orderIndex: exercise.orderIndex,
    })),
  };
}

// ─────────────────────────────────────────
// DTOs de entreno
// ─────────────────────────────────────────

export const workoutDetailInclude = {
  routine: { include: { exercises: { orderBy: { orderIndex: "asc" } } } },
  sets: { orderBy: [{ exerciseName: "asc" }, { setNumber: "asc" }] },
} satisfies Prisma.GymWorkoutInclude;

type WorkoutRow = {
  id: number;
  routineId: number;
  date: Date;
  notes: string | null;
  finishedAt: Date | null;
  createdAt: Date;
  routine: { id: number; name: string; exercises: { id: number; name: string; type: string; orderIndex: number }[] };
  sets: SetRow[];
};

export type WorkoutDetailDTO = {
  id: number;
  routineId: number;
  routineName: string;
  date: string;
  notes: string | null;
  startedAt: string;
  finishedAt: string | null;
  durationSecs: number | null;
  totalVolume: number;
  exercises: { id: number; name: string; type: ExerciseType; orderIndex: number }[];
  sets: WorkoutSetDTO[];
};

export function toWorkoutDetailDTO(workout: WorkoutRow): WorkoutDetailDTO {
  const sets = workout.sets.map(toSetDTO);
  return {
    id: workout.id,
    routineId: workout.routineId,
    routineName: workout.routine.name,
    date: dbDateKey(workout.date),
    notes: workout.notes,
    startedAt: workout.createdAt.toISOString(),
    finishedAt: workout.finishedAt ? workout.finishedAt.toISOString() : null,
    durationSecs: workoutDuration(workout),
    totalVolume: sets.reduce((acc, set) => acc + set.volume, 0),
    exercises: workout.routine.exercises.map((exercise) => ({
      id: exercise.id,
      name: exercise.name,
      type: exercise.type as ExerciseType,
      orderIndex: exercise.orderIndex,
    })),
    sets,
  };
}

export type WorkoutSummaryDTO = {
  id: number;
  routineId: number;
  routineName: string;
  date: string;
  notes: string | null;
  startedAt: string;
  finishedAt: string | null;
  durationSecs: number | null;
  totalVolume: number;
  setCount: number;
  exerciseCount: number;
};

export function toWorkoutSummaryDTO(workout: {
  id: number;
  routineId: number;
  date: Date;
  notes: string | null;
  finishedAt: Date | null;
  createdAt: Date;
  routine: { name: string };
  sets: Pick<SetRow, "exerciseName" | "reps" | "weightKg">[];
}): WorkoutSummaryDTO {
  return {
    id: workout.id,
    routineId: workout.routineId,
    routineName: workout.routine.name,
    date: dbDateKey(workout.date),
    notes: workout.notes,
    startedAt: workout.createdAt.toISOString(),
    finishedAt: workout.finishedAt ? workout.finishedAt.toISOString() : null,
    durationSecs: workoutDuration(workout),
    totalVolume: workout.sets.reduce((acc, set) => acc + setVolume(set), 0),
    setCount: workout.sets.length,
    exerciseCount: new Set(workout.sets.map((set) => set.exerciseName)).size,
  };
}
