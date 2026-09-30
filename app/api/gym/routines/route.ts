import { withAuth } from "@/lib/auth";
import { ok, created } from "@/lib/http";
import { prisma } from "@/lib/db";
import { routineBodySchema, routineInclude, toRoutineDTO } from "@/app/api/gym/_lib";

export const GET = withAuth(async () => {
  const routines = await prisma.gymRoutine.findMany({
    orderBy: { createdAt: "asc" },
    include: routineInclude,
  });
  return ok(routines.map(toRoutineDTO));
});

export const POST = withAuth(async ({ req }) => {
  const data = routineBodySchema.parse(await req.json());

  const routine = await prisma.gymRoutine.create({
    data: {
      name: data.name,
      exercises: {
        create: data.exercises.map((exercise, index) => ({
          name: exercise.name,
          type: exercise.type,
          orderIndex: index,
        })),
      },
    },
    include: routineInclude,
  });

  return created(toRoutineDTO(routine));
});
