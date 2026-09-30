import { withAuth } from "@/lib/auth";
import { ok, notFound } from "@/lib/http";
import { prisma } from "@/lib/db";
import {
  parseIdParam,
  routineBodySchema,
  routineInclude,
  toRoutineDTO,
} from "@/app/api/gym/_lib";


export const PUT = withAuth<{ id: string }>(async ({ req, params }) => {
  const id = parseIdParam(params.id, "id de rutina");
  const data = routineBodySchema.parse(await req.json());

  const exists = await prisma.gymRoutine.findUnique({ where: { id } });
  if (!exists) throw notFound("La rutina no existe");

  // Renombrar + reemplazar la lista completa de ejercicios respetando el orden.
  const routine = await prisma.$transaction(async (tx) => {
    await tx.gymRoutine.update({ where: { id }, data: { name: data.name } });
    await tx.gymRoutineExercise.deleteMany({ where: { routineId: id } });
    if (data.exercises.length) {
      await tx.gymRoutineExercise.createMany({
        data: data.exercises.map((exercise, index) => ({
          routineId: id,
          name: exercise.name,
          type: exercise.type,
          orderIndex: index,
        })),
      });
    }
    return tx.gymRoutine.findUniqueOrThrow({ where: { id }, include: routineInclude });
  });

  return ok(toRoutineDTO(routine));
});

export const DELETE = withAuth<{ id: string }>(async ({ params }) => {
  const id = parseIdParam(params.id, "id de rutina");

  const exists = await prisma.gymRoutine.findUnique({ where: { id } });
  if (!exists) throw notFound("La rutina no existe");

  // Borrado en cascada manual: sets -> entrenos -> ejercicios -> rutina.
  await prisma.$transaction(async (tx) => {
    const workouts = await tx.gymWorkout.findMany({
      where: { routineId: id },
      select: { id: true },
    });
    const workoutIds = workouts.map((w) => w.id);
    if (workoutIds.length) {
      await tx.gymWorkoutSet.deleteMany({ where: { workoutId: { in: workoutIds } } });
      await tx.gymWorkout.deleteMany({ where: { id: { in: workoutIds } } });
    }
    await tx.gymRoutineExercise.deleteMany({ where: { routineId: id } });
    await tx.gymRoutine.delete({ where: { id } });
  });

  return ok({ success: true });
});
