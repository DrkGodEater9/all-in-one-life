import { withAuth } from "@/lib/auth";
import { notFound, ok } from "@/lib/http";
import { prisma } from "@/lib/db";
import { parseId } from "../../_lib";

/** DELETE /api/calendar/reminders/[id] */
export const DELETE = withAuth<{ id: string }>(async ({ params }) => {
  const id = parseId(params.id);

  const reminder = await prisma.calendarReminder.findUnique({ where: { id } });
  if (!reminder) throw notFound("Recordatorio no encontrado");

  await prisma.calendarReminder.delete({ where: { id } });

  return ok({ success: true });
});
