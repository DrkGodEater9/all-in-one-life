import { z } from "zod";
import { withAuth } from "@/lib/auth";
import { created, ok } from "@/lib/http";
import { prisma } from "@/lib/db";
import { parseDateKey } from "@/lib/utils";
import {
  eventData,
  eventFieldsSchema,
  eventInclude,
  eventWhere,
  eventsQuerySchema,
  generateOccurrences,
  queryObject,
  recurrenceSchema,
  reminderData,
  reminderInputSchema,
} from "../_lib";

const createSchema = eventFieldsSchema.extend({
  recurrence: recurrenceSchema.optional().nullable(),
  reminders: z.array(reminderInputSchema).max(10).optional(),
});

/** GET /api/calendar/events ?from=&to=&category= */
export const GET = withAuth(async ({ searchParams }) => {
  const filters = eventsQuerySchema.parse(queryObject(searchParams));

  const events = await prisma.calendarEvent.findMany({
    where: eventWhere(filters),
    include: eventInclude,
    orderBy: [{ date: "asc" }, { time: "asc" }, { id: "asc" }],
  });

  return ok(events);
});

/**
 * POST /api/calendar/events
 *
 * Si viene `recurrence`, crea la `RecurrenceRule` y **materializa cada
 * ocurrencia como una fila de `CalendarEvent`** que comparte `recurrenceId`
 * (tope documentado en `generateOccurrences`). Los recordatorios se replican
 * en todas las ocurrencias para que el cron los dispare una por una.
 *
 * Devuelve la primera ocurrencia y cuántas filas se crearon.
 */
export const POST = withAuth(async ({ req }) => {
  const body = createSchema.parse(await req.json());
  const base = eventData(body);
  const reminders = body.reminders ?? [];

  const result = await prisma.$transaction(async (tx) => {
    if (!body.recurrence) {
      const event = await tx.calendarEvent.create({
        data: { ...base, date: parseDateKey(body.date) },
      });
      if (reminders.length) {
        await tx.calendarReminder.createMany({
          data: reminders.map((r) => reminderData(r, event.id)),
        });
      }
      return { firstId: event.id, occurrences: 1 };
    }

    const rule = await tx.recurrenceRule.create({
      data: {
        frequency: body.recurrence.frequency,
        intervalN: body.recurrence.intervalN,
        dayOfMonth: body.recurrence.dayOfMonth ?? null,
        endsOn: body.recurrence.endsOn ? parseDateKey(body.recurrence.endsOn) : null,
      },
    });

    const dates = generateOccurrences(body.date, body.recurrence);
    await tx.calendarEvent.createMany({
      data: dates.map((date) => ({ ...base, date, recurrenceId: rule.id })),
    });

    const createdEvents = await tx.calendarEvent.findMany({
      where: { recurrenceId: rule.id },
      select: { id: true },
      orderBy: [{ date: "asc" }, { id: "asc" }],
    });

    if (reminders.length) {
      await tx.calendarReminder.createMany({
        data: createdEvents.flatMap((e) => reminders.map((r) => reminderData(r, e.id))),
      });
    }

    return { firstId: createdEvents[0].id, occurrences: createdEvents.length };
  });

  const event = await prisma.calendarEvent.findUniqueOrThrow({
    where: { id: result.firstId },
    include: eventInclude,
  });

  return created({ event, occurrences: result.occurrences });
});
