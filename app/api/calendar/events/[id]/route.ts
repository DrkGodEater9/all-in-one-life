import { withAuth } from "@/lib/auth";
import { notFound, ok } from "@/lib/http";
import { prisma } from "@/lib/db";
import { parseDateKey } from "@/lib/utils";
import {
  deleteEventsCascade,
  deleteRecurrenceSchema,
  eventData,
  eventFieldsSchema,
  eventInclude,
  parseId,
  queryObject,
} from "../../_lib";

const updateSchema = eventFieldsSchema;

/**
 * PUT /api/calendar/events/[id]
 *
 * Edita **una sola ocurrencia**. La regla de recurrencia no se toca: cambiar
 * la frecuencia de una serie ya materializada implicaría regenerar filas, lo
 * que queda fuera de fase 1 (se borra la serie y se vuelve a crear).
 */
export const PUT = withAuth<{ id: string }>(async ({ req, params }) => {
  const id = parseId(params.id);
  const body = updateSchema.parse(await req.json());

  const existing = await prisma.calendarEvent.findUnique({ where: { id } });
  if (!existing) throw notFound("Evento no encontrado");

  const event = await prisma.calendarEvent.update({
    where: { id },
    data: { ...eventData(body), date: parseDateKey(body.date) },
    include: eventInclude,
  });

  return ok(event);
});

/**
 * DELETE /api/calendar/events/[id] ?deleteRecurrence=this|future|all
 *
 * - sin parámetro o `this` → solo esa ocurrencia
 * - `future`               → esa y todas las posteriores de la serie
 * - `all`                  → la serie entera + su `RecurrenceRule`
 *
 * Siempre borra en cascada los `CalendarReminder` (el schema no declara
 * `onDelete: Cascade`), dentro de una transacción.
 */
export const DELETE = withAuth<{ id: string }>(async ({ params, searchParams }) => {
  const id = parseId(params.id);
  const { deleteRecurrence } = deleteRecurrenceSchema.parse(queryObject(searchParams));

  const event = await prisma.calendarEvent.findUnique({ where: { id } });
  if (!event) throw notFound("Evento no encontrado");

  const mode = event.recurrenceId ? (deleteRecurrence ?? "this") : "this";
  let ids: number[] = [id];

  if (event.recurrenceId && mode !== "this") {
    const siblings = await prisma.calendarEvent.findMany({
      where: {
        recurrenceId: event.recurrenceId,
        ...(mode === "future" ? { date: { gte: event.date } } : {}),
      },
      select: { id: true },
    });
    ids = siblings.map((e) => e.id);
    if (!ids.includes(id)) ids.push(id);
  }

  const deleted = await deleteEventsCascade(ids, event.recurrenceId);

  return ok({ success: true, deleted, mode });
});
