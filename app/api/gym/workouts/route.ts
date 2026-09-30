import { z } from "zod";
import { withAuth } from "@/lib/auth";
import { ok, created, notFound } from "@/lib/http";
import { prisma } from "@/lib/db";
import { parseDateKey, toDateKey } from "@/lib/utils";
import {
  dateKeySchema,
  toWorkoutDetailDTO,
  toWorkoutSummaryDTO,
  workoutBodySchema,
  workoutDetailInclude,
} from "@/app/api/gym/_lib";

const querySchema = z.object({
  routineId: z.coerce.number().int().positive().optional(),
  from: dateKeySchema.optional(),
  to: dateKeySchema.optional(),
  limit: z.coerce.number().int().positive().max(200).default(50),
});

export const GET = withAuth(async ({ searchParams }) => {
  const query = querySchema.parse(Object.fromEntries(searchParams));

  const workouts = await prisma.gymWorkout.findMany({
    where: {
      routineId: query.routineId,
      date: {
        gte: query.from ? parseDateKey(query.from) : undefined,
        lte: query.to ? parseDateKey(query.to) : undefined,
      },
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take: query.limit,
    include: {
      routine: { select: { name: true } },
      sets: { select: { exerciseName: true, reps: true, weightKg: true } },
    },
  });

  return ok(workouts.map(toWorkoutSummaryDTO));
});

export const POST = withAuth(async ({ req }) => {
  const data = workoutBodySchema.parse(await req.json());

  const routine = await prisma.gymRoutine.findUnique({ where: { id: data.routineId } });
  if (!routine) throw notFound("La rutina no existe");

  const workout = await prisma.gymWorkout.create({
    data: {
      routineId: data.routineId,
      date: parseDateKey(data.date ?? toDateKey()),
      notes: data.notes ?? null,
    },
    include: workoutDetailInclude,
  });

  return created(toWorkoutDetailDTO(workout));
});
