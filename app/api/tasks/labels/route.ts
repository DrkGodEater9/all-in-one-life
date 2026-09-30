import { withAuth } from "@/lib/auth";
import { badRequest, created, ok } from "@/lib/http";
import { prisma } from "@/lib/db";
import type { TaskLabelWithCount } from "@/components/modules/tasks/constants";
import { createLabelSchema } from "../_lib";

/** GET /api/tasks/labels — etiquetas con el número de tareas que las usan. */
export const GET = withAuth(async () => {
  const labels = await prisma.taskLabel.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { tasks: true } } },
  });

  const payload: TaskLabelWithCount[] = labels.map((label) => ({
    id: label.id,
    name: label.name,
    color: label.color,
    taskCount: label._count.tasks,
  }));

  return ok(payload);
});

/** POST /api/tasks/labels — `name` es @unique, así que el duplicado es un 400. */
export const POST = withAuth(async ({ req }) => {
  const body = createLabelSchema.parse(await req.json());

  const existing = await prisma.taskLabel.findUnique({ where: { name: body.name } });
  if (existing) throw badRequest("Ya existe una etiqueta con ese nombre");

  const label = await prisma.taskLabel.create({
    data: { name: body.name, color: body.color ?? null },
  });

  return created({ id: label.id, name: label.name, color: label.color, taskCount: 0 });
});
