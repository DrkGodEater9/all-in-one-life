import { z } from "zod";
import { withAuth } from "@/lib/auth";
import { ok, notFound } from "@/lib/http";
import { prisma } from "@/lib/db";
import { parseIdParam, toWorkoutSummaryDTO } from "@/app/api/gym/_lib";

const querySchema = z.object({
  limit: z.coerce.number().int().positive().max(200).default(50),
});

export const GET = withAuth<{ routineId: string }>(async ({ params, searchParams }) => {
  const routineId = parseIdParam(params.routineId, "id de rutina");
  const query = querySchema.parse(Object.fromEntries(searchParams));

  const routine = await prisma.gymRoutine.findUnique({ where: { id: routineId } });
  if (!routine) throw notFound("La rutina no existe");

  const workouts = await prisma.gymWorkout.findMany({
    where: { routineId },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take: query.limit,
    include: {
      routine: { select: { name: true } },
      sets: { select: { exerciseName: true, reps: true, weightKg: true } },
    },
  });

  return ok(workouts.map(toWorkoutSummaryDTO));
});
