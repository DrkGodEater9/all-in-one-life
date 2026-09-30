import { withAuth } from "@/lib/auth";
import { created, ok } from "@/lib/http";
import { prisma } from "@/lib/db";
import { parseDateKey, parseTime } from "@/lib/utils";
import {
  applyRecurrence,
  createTaskSchema,
  findTaskOrThrow,
  queryObject,
  resolveFlags,
  resolveLabelIds,
  taskFiltersSchema,
  taskInclude,
  taskOrderBy,
  taskWhere,
  toTaskDTO,
} from "./_lib";

/** GET /api/tasks ?status=&urgent=&important=&label=&quadrant=&q=&from=&to= */
export const GET = withAuth(async ({ searchParams }) => {
  const filters = taskFiltersSchema.parse(queryObject(searchParams));

  const tasks = await prisma.task.findMany({
    where: taskWhere(filters),
    include: taskInclude,
    orderBy: taskOrderBy,
  });

  return ok(tasks.map(toTaskDTO));
});

/**
 * POST /api/tasks
 * Crea la tarea, su regla de recurrencia (si viene) y sus etiquetas — las que
 * lleguen por `labelNames` y no existan se crean — en una sola transacción.
 */
export const POST = withAuth(async ({ req }) => {
  const body = createTaskSchema.parse(await req.json());
  const flags = resolveFlags(body, { urgent: false, important: false });

  const task = await prisma.$transaction(async (tx) => {
    const recurrenceId = body.recurrence
      ? await applyRecurrence(tx, null, body.recurrence)
      : null;
    const labelIds = await resolveLabelIds(tx, body);

    const row = await tx.task.create({
      data: {
        title: body.title,
        description: body.description?.trim() ? body.description.trim() : null,
        urgent: flags.urgent,
        important: flags.important,
        status: body.status,
        date: body.date ? parseDateKey(body.date) : null,
        time: body.time ? parseTime(body.time) : null,
        recurrenceId,
        doneAt: body.status === "done" ? new Date() : null,
      },
    });

    if (labelIds.length) {
      await tx.taskLabelAssignment.createMany({
        data: labelIds.map((labelId) => ({ taskId: row.id, labelId })),
        skipDuplicates: true,
      });
    }

    return findTaskOrThrow(row.id, tx);
  });

  return created(toTaskDTO(task));
});
