import { z } from "zod";
import { withAuth } from "@/lib/auth";
import { ok } from "@/lib/http";
import { prisma } from "@/lib/db";
import {
  dbDateKey,
  decToNumber,
  decodeExerciseName,
  setVolume,
} from "@/app/api/gym/_lib";

const querySchema = z.object({
  limit: z.coerce.number().int().positive().max(200).default(30),
});

type ExerciseSessionDTO = {
  workoutId: number;
  date: string;
  routineName: string;
  setCount: number;
  maxWeightKg: number | null;
  totalVolume: number;
  totalReps: number;
  totalDurationSecs: number;
  totalDistanceKm: number;
};

/** Por sesión: fecha, peso máximo y volumen total (Σ reps × kg). */
export const GET = withAuth<{ name: string }>(async ({ params, searchParams }) => {
  const name = decodeExerciseName(params.name);
  const query = querySchema.parse(Object.fromEntries(searchParams));

  const sets = await prisma.gymWorkoutSet.findMany({
    where: { exerciseName: name },
    include: {
      workout: {
        select: { id: true, date: true, createdAt: true, routine: { select: { name: true } } },
      },
    },
  });

  const sessions = new Map<number, ExerciseSessionDTO>();

  for (const set of sets) {
    const key = set.workout.id;
    const session =
      sessions.get(key) ??
      ({
        workoutId: key,
        date: dbDateKey(set.workout.date),
        routineName: set.workout.routine.name,
        setCount: 0,
        maxWeightKg: null,
        totalVolume: 0,
        totalReps: 0,
        totalDurationSecs: 0,
        totalDistanceKm: 0,
      } satisfies ExerciseSessionDTO);

    const weight = decToNumber(set.weightKg);
    session.setCount += 1;
    session.totalVolume += setVolume(set);
    session.totalReps += set.reps ?? 0;
    session.totalDurationSecs += set.durationSecs ?? 0;
    session.totalDistanceKm += decToNumber(set.distanceKm) ?? 0;
    if (weight !== null && (session.maxWeightKg === null || weight > session.maxWeightKg)) {
      session.maxWeightKg = weight;
    }

    sessions.set(key, session);
  }

  const ordered = Array.from(sessions.values()).sort((a, b) => a.date.localeCompare(b.date));
  const limited = ordered.slice(Math.max(0, ordered.length - query.limit));

  return ok(limited.map((s) => ({ ...s, totalDistanceKm: Number(s.totalDistanceKm.toFixed(3)) })));
});
