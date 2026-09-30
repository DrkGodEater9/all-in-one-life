import { withAuth } from "@/lib/auth";
import { ok, notFound } from "@/lib/http";
import { prisma } from "@/lib/db";
import {
  parseIdParam,
  toWorkoutDetailDTO,
  workoutDetailInclude,
} from "@/app/api/gym/_lib";

export const GET = withAuth<{ id: string }>(async ({ params }) => {
  const id = parseIdParam(params.id, "id de entreno");

  const workout = await prisma.gymWorkout.findUnique({
    where: { id },
    include: workoutDetailInclude,
  });
  if (!workout) throw notFound("El entreno no existe");

  return ok(toWorkoutDetailDTO(workout));
});
