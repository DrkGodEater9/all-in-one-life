import type { Prisma } from "@prisma/client";
import { withAuth } from "@/lib/auth";
import { ok } from "@/lib/http";
import { prisma } from "@/lib/db";
import { parseDateKey, parseTime } from "@/lib/utils";
import type { TaskStatus } from "@/components/modules/tasks/constants";
import {
  applyRecurrence,
  deleteRuleIfOrphan,
  findTaskOrThrow,
  parseId,
  patchTaskSchema,
  putTaskSchema,
  resolveFlags,
  resolveLabelIds,
  spawnNextOccurrence,
  syncTaskLabels,
  toTaskDTO,
} from "../_lib";

/**
 * PUT /api/tasks/[id] — reemplazo completo: lo que no venga en el body se
 * limpia (descripción, fecha, hora, etiquetas y recurrencia incluidas).
 */
export const PUT = withAuth<{ id: string }>(async ({ req, params }) => {
  const id = parseId(params.id);
  const body = putTaskSchema.parse(await req.json());
  const current = await findTaskOrThrow(id);

  const flags = resolveFlags(body, { urgent: false, important: false });
  const becomesDone = body.status === "done" && current.status !== "done";

  const task = await prisma.$transaction(async (tx) => {
    const recurrenceId = await applyRecurrence(
      tx,
      current.recurrenceId,
      body.recurrence ?? null
    );
    const labelIds = await resolveLabelIds(tx, body);

    await tx.task.update({
      where: { id },
      data: {
        title: body.title,
        description: body.description?.trim() ? body.description.trim() : null,
        urgent: flags.urgent,
        important: flags.important,
        status: body.status,
        date: body.date ? parseDateKey(body.date) : null,
        time: body.time ? parseTime(body.time) : null,
        recurrenceId,
        doneAt: body.status === "done" ? (current.doneAt ?? new Date()) : null,
      },
    });
    await syncTaskLabels(tx, id, labelIds);

    const updated = await findTaskOrThrow(id, tx);
    if (becomesDone) await spawnNextOccurrence(tx, updated);
    return updated;
  });

  return ok(toTaskDTO(task));
});

/**
 * PATCH /api/tasks/[id] — parche parcial. Solo se tocan las claves presentes
 * en el body, así que el drag & drop de la matriz puede mandar únicamente
 * `{ urgent, important }` (o `{ quadrant }`) sin arrastrar el resto de la tarea.
 */
export const PATCH = withAuth<{ id: string }>(async ({ req, params }) => {
  const id = parseId(params.id);
  const body = patchTaskSchema.parse(await req.json());
  const current = await findTaskOrThrow(id);

  const touchesFlags =
    body.quadrant !== undefined ||
    body.urgent !== undefined ||
    body.important !== undefined;
  const flags = resolveFlags(body, {
    urgent: current.urgent,
    important: current.important,
  });

  const nextStatus: TaskStatus = body.status ?? (current.status as TaskStatus);
  const becomesDone = nextStatus === "done" && current.status !== "done";

  const data: Prisma.TaskUpdateInput = {};
  if (body.title !== undefined) data.title = body.title;
  if (body.description !== undefined) {
    data.description = body.description?.trim() ? body.description.trim() : null;
  }
  if (touchesFlags) {
    data.urgent = flags.urgent;
    data.important = flags.important;
  }
  if (body.status !== undefined) {
    data.status = body.status;
    data.doneAt = body.status === "done" ? (current.doneAt ?? new Date()) : null;
  }
  if (body.date !== undefined) data.date = body.date ? parseDateKey(body.date) : null;
  if (body.time !== undefined) data.time = body.time ? parseTime(body.time) : null;

  const task = await prisma.$transaction(async (tx) => {
    if (body.recurrence !== undefined) {
      const recurrenceId = await applyRecurrence(
        tx,
        current.recurrenceId,
        body.recurrence ?? null
      );
      data.recurrence = recurrenceId
        ? { connect: { id: recurrenceId } }
        : { disconnect: true };
    }

    await tx.task.update({ where: { id }, data });

    if (body.labelIds !== undefined || body.labelNames !== undefined) {
      const labelIds = await resolveLabelIds(tx, body);
      await syncTaskLabels(tx, id, labelIds);
    }

    const updated = await findTaskOrThrow(id, tx);
    if (becomesDone) await spawnNextOccurrence(tx, updated);
    return updated;
  });

  return ok(toTaskDTO(task));
});

/** DELETE /api/tasks/[id] — borra la tarea, sus asignaciones y la regla huérfana. */
export const DELETE = withAuth<{ id: string }>(async ({ params }) => {
  const id = parseId(params.id);
  const current = await findTaskOrThrow(id);

  await prisma.$transaction(async (tx) => {
    await tx.taskLabelAssignment.deleteMany({ where: { taskId: id } });
    await tx.task.delete({ where: { id } });
    if (current.recurrenceId) {
      await deleteRuleIfOrphan(tx, current.recurrenceId, id);
    }
  });

  return ok({ success: true });
});
