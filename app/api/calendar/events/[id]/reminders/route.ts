import { withAuth } from "@/lib/auth";
import { created, notFound } from "@/lib/http";
import { prisma } from "@/lib/db";
import { parseId, reminderData, reminderInputSchema } from "../../../_lib";

/**
 * POST /api/calendar/events/[id]/reminders
 * Body: { remindType: 'same_day'|'day_before'|'custom', remindTime: 'HH:mm', daysBefore?: number }
 */
export const POST = withAuth<{ id: string }>(async ({ req, params }) => {
  const eventId = parseId(params.id);
  const body = reminderInputSchema.parse(await req.json());

  const event = await prisma.calendarEvent.findUnique({ where: { id: eventId } });
  if (!event) throw notFound("Evento no encontrado");

  const reminder = await prisma.calendarReminder.create({
    data: reminderData(body, eventId),
  });

  return created(reminder);
});
