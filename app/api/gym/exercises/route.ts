import { withAuth } from "@/lib/auth";
import { ok } from "@/lib/http";
import { prisma } from "@/lib/db";
import type { ExerciseType } from "@/app/api/gym/_lib";

/**
 * Catálogo de ejercicios para el selector de Progreso: los de las rutinas
 * actuales más los que ya solo viven en el historial (rutinas editadas).
 */
export const GET = withAuth(async () => {
  const [logged, planned] = await Promise.all([
    prisma.gymWorkoutSet.findMany({
      distinct: ["exerciseName"],
      select: { exerciseName: true, exerciseType: true },
    }),
    prisma.gymRoutineExercise.findMany({
      distinct: ["name"],
      select: { name: true, type: true },
    }),
  ]);

  const byName = new Map<string, { name: string; type: ExerciseType; logged: boolean }>();

  planned.forEach((exercise) => {
    byName.set(exercise.name, {
      name: exercise.name,
      type: exercise.type as ExerciseType,
      logged: false,
    });
  });
  logged.forEach((set) => {
    byName.set(set.exerciseName, {
      name: set.exerciseName,
      type: set.exerciseType as ExerciseType,
      logged: true,
    });
  });

  return ok(
    Array.from(byName.values()).sort((a, b) => a.name.localeCompare(b.name, "es"))
  );
});
