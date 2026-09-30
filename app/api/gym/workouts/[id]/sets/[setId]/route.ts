import { withAuth } from "@/lib/auth";
import { ok, notFound } from "@/lib/http";
import { prisma } from "@/lib/db";
import { parseIdParam } from "@/app/api/gym/_lib";

export const DELETE = withAuth<{ id: string; setId: string }>(async ({ params }) => {
  const workoutId = parseIdParam(params.id, "id de entreno");
  const setId = parseIdParam(params.setId, "id de serie");

  const set = await prisma.gymWorkoutSet.findUnique({ where: { id: setId } });
  if (!set || set.workoutId !== workoutId) throw notFound("La serie no existe");

  // Al borrar se renumeran las series restantes del ejercicio para no dejar huecos.
  await prisma.$transaction(async (tx) => {
    await tx.gymWorkoutSet.delete({ where: { id: setId } });

    const remaining = await tx.gymWorkoutSet.findMany({
      where: { workoutId, exerciseName: set.exerciseName },
      orderBy: { setNumber: "asc" },
      select: { id: true, setNumber: true },
    });

    for (let index = 0; index < remaining.length; index += 1) {
      const next = index + 1;
      if (remaining[index].setNumber !== next) {
        await tx.gymWorkoutSet.update({
          where: { id: remaining[index].id },
          data: { setNumber: next },
        });
      }
    }
  });

  return ok({ success: true });
});
