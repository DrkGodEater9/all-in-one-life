import { withAuth } from "@/lib/auth";
import { ok } from "@/lib/http";
import { prisma } from "@/lib/db";
import {
  dbDateKey,
  decToNumber,
  decodeExerciseName,
  setVolume,
} from "@/app/api/gym/_lib";

type PersonalRecord = { value: number; date: string; workoutId: number } | null;

/** Records personales: mejor peso y mejor volumen total en una sesión. */
export const GET = withAuth<{ name: string }>(async ({ params }) => {
  const name = decodeExerciseName(params.name);

  const sets = await prisma.gymWorkoutSet.findMany({
    where: { exerciseName: name },
    include: { workout: { select: { id: true, date: true } } },
  });

  let bestWeight: PersonalRecord = null;
  let bestReps: PersonalRecord = null;
  const volumeBySession = new Map<number, { volume: number; date: string }>();

  for (const set of sets) {
    const date = dbDateKey(set.workout.date);
    const weight = decToNumber(set.weightKg);

    if (weight !== null && (!bestWeight || weight > bestWeight.value)) {
      bestWeight = { value: weight, date, workoutId: set.workout.id };
    }
    if (set.reps !== null && (!bestReps || set.reps > bestReps.value)) {
      bestReps = { value: set.reps, date, workoutId: set.workout.id };
    }

    const current = volumeBySession.get(set.workout.id) ?? { volume: 0, date };
    current.volume += setVolume(set);
    volumeBySession.set(set.workout.id, current);
  }

  let bestVolume: PersonalRecord = null;
  volumeBySession.forEach((session, workoutId) => {
    if (session.volume > 0 && (!bestVolume || session.volume > bestVolume.value)) {
      bestVolume = { value: session.volume, date: session.date, workoutId };
    }
  });

  return ok({
    exerciseName: name,
    sessionCount: volumeBySession.size,
    setCount: sets.length,
    bestWeight,
    bestVolume,
    bestReps,
  });
});
