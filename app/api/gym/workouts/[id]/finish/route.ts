import { withAuth } from "@/lib/auth";
import { ok, notFound } from "@/lib/http";
import { prisma } from "@/lib/db";
import {
  parseIdParam,
  toWorkoutDetailDTO,
  workoutDetailInclude,
} from "@/app/api/gym/_lib";

export const PUT = withAuth<{ id: string }>(async ({ params }) => {
  const id = parseIdParam(params.id, "id de entreno");

  const existing = await prisma.gymWorkout.findUnique({ where: { id } });
  if (!existing) throw notFound("El entreno no existe");

  const workout = existing.finishedAt
    ? await prisma.gymWorkout.findUniqueOrThrow({
        where: { id },
        include: workoutDetailInclude,
      })
    : await prisma.gymWorkout.update({
        where: { id },
        data: { finishedAt: new Date() },
        include: workoutDetailInclude,
      });

  return ok(toWorkoutDetailDTO(workout));
});
