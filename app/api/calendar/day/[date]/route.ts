import { withAuth } from "@/lib/auth";
import { ok } from "@/lib/http";
import { prisma } from "@/lib/db";
import { formatTime, parseDateKey } from "@/lib/utils";
import { dateKeySchema } from "../../_lib";
import type { DayItem } from "@/components/modules/calendar/types";
import type { EventCategory } from "@/components/modules/calendar/constants";

/**
 * GET /api/calendar/day/[date]  (date = YYYY-MM-DD)
 *
 * Devuelve, en una sola lista ordenada por hora, los eventos del día y las
 * tareas con esa fecha. Cada item lleva `kind: "event" | "task"` para que la
 * UI las distinga con badges distintos.
 *
 * Las tareas se leen aquí vía Prisma a propósito: el módulo de tareas es
 * dueño de `/api/tasks`, esta ruta solo las consulta en lectura.
 */
export const GET = withAuth<{ date: string }>(async ({ params }) => {
  const dateKey = dateKeySchema.parse(params.date);
  const date = parseDateKey(dateKey);

  const [events, tasks] = await Promise.all([
    prisma.calendarEvent.findMany({
      where: { date },
      include: { reminders: { orderBy: { id: "asc" } } },
      orderBy: [{ time: "asc" }, { id: "asc" }],
    }),
    prisma.task.findMany({
      where: { date },
      orderBy: [{ time: "asc" }, { id: "asc" }],
    }),
  ]);

  const items: DayItem[] = [
    ...events.map<DayItem>((e) => ({
      kind: "event",
      id: e.id,
      title: e.title,
      time: formatTime(e.time),
      category: e.category as EventCategory,
      location: e.location,
      meetingLink: e.meetingLink,
      notes: e.notes,
      recurrenceId: e.recurrenceId,
      reminders: e.reminders.map((r) => ({
        id: r.id,
        eventId: r.eventId,
        remindType: r.remindType as "same_day" | "day_before" | "custom",
        remindTime: formatTime(r.remindTime),
        daysBefore: r.daysBefore,
        isSent: r.isSent,
      })),
    })),
    ...tasks.map<DayItem>((t) => ({
      kind: "task",
      id: t.id,
      title: t.title,
      time: t.time ? formatTime(t.time) : null,
      description: t.description,
      status: t.status,
      urgent: t.urgent,
      important: t.important,
    })),
  ];

  // Sin hora al final; a igual hora, primero los eventos.
  items.sort((a, b) => {
    const ta = a.time ?? "99:99";
    const tb = b.time ?? "99:99";
    if (ta !== tb) return ta < tb ? -1 : 1;
    if (a.kind !== b.kind) return a.kind === "event" ? -1 : 1;
    return a.id - b.id;
  });

  return ok({ date: dateKey, items });
});
