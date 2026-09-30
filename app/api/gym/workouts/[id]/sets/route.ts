import { withAuth } from "@/lib/auth";
import { created, notFound } from "@/lib/http";
import { prisma } from "@/lib/db";
import { parseIdParam, toSetDTO, workoutSetBodySchema } from "@/app/api/gym/_lib";

export const POST = withAuth<{ id: string }>(async ({ req, params }) => {
  const workoutId = parseIdParam(params.id, "id de entreno");
  const data = workoutSetBodySchema.parse(await req.json());

  const workout = await prisma.gymWorkout.findUnique({ where: { id: workoutId } });
  if (!workout) throw notFound("El entreno no existe");

  // setNumber lo calcula el servidor: el siguiente para ese ejercicio dentro del entreno.
  const set = await prisma.$transaction(async (tx) => {
    const last = await tx.gymWorkoutSet.findFirst({
      where: { workoutId, exerciseName: data.exerciseName },
      orderBy: { setNumber: "desc" },
      select: { setNumber: true },
    });

    return tx.gymWorkoutSet.create({
      data: {
        workoutId,
        exerciseName: data.exerciseName,
        exerciseType: data.exerciseType,
        setNumber: (last?.setNumber ?? 0) + 1,
        reps: data.exerciseType === "cardio" ? null : data.reps,
        weightKg: data.exerciseType === "weight" ? data.weightKg : null,
        durationSecs: data.exerciseType === "cardio" ? data.durationSecs : null,
        distanceKm:
          data.exerciseType === "cardio" ? data.distanceKm ?? null : null,
        notes: data.notes ?? null,
      },
    });
  });

  return created(toSetDTO(set));
});
