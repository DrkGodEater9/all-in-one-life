import { assertCronSecret, withRoute } from "@/lib/auth";
import { ok } from "@/lib/http";
import { prisma } from "@/lib/db";
import { formatTime } from "@/lib/utils";
import { addUtcDays, reminderTriggerAt, toDateKeyUTC } from "../../calendar/_lib";

/** Cuántos recordatorios pendientes se revisan por ejecución. */
const BATCH_SIZE = 500;

export interface ReminderNotification {
  reminderId: number;
  eventId: number;
  triggerAt: string;
  message: string;
}

/**
 * Punto de extensión de FASE 2: aquí se enviará el mensaje por el
 * `notify_bot` de Telegram (o cualquier otro canal).
 *
 * En fase 1 no hace nada a propósito: el aviso se ve dentro de la app y el
 * recordatorio solo se marca como enviado. Para conectarlo basta con
 * implementar esta función (p. ej. POST a la Bot API con TELEGRAM_BOT_TOKEN y
 * TELEGRAM_CHAT_ID) sin tocar el resto de la ruta.
 */
async function dispatchNotification(_notification: ReminderNotification): Promise<void> {
  // TODO (fase 2): enviar por Telegram.
  return;
}

/** Texto del aviso: título, hora, lugar y link si tiene. */
function buildMessage(event: {
  title: string;
  date: Date;
  time: Date;
  location: string | null;
  meetingLink: string | null;
}): string {
  const parts = [
    `⏰ ${event.title}`,
    `${toDateKeyUTC(event.date)} a las ${formatTime(event.time)}`,
  ];
  if (event.location) parts.push(`📍 ${event.location}`);
  if (event.meetingLink) parts.push(`🔗 ${event.meetingLink}`);
  return parts.join("\n");
}

/**
 * GET /api/cron/reminders — Vercel Cron.
 *
 * El spec pide una ejecución cada 10 minutos, pero el plan Hobby de Vercel
 * limita los cron jobs a una ejecución diaria. `vercel.json` corre esto a las
 * 11:00 UTC (~6am Bogotá). Efecto real: un recordatorio con `remindTime`
 * posterior a esa hora se marca `isSent` con hasta ~24h de retraso, no en el
 * momento exacto — es la limitación del plan, no un bug. Con Pro, volver al
 * schedule de cada 10 minutos en `vercel.json` sin tocar esta ruta.
 *
 * 1. Busca recordatorios `isSent: false` cuyo momento de disparo
 *    (fecha del evento − `daysBefore`, a la hora `remindTime`) ya pasó.
 * 2. Prepara el mensaje de cada uno.
 * 3. Fase 2: lo manda por Telegram (ver `dispatchNotification`).
 * 4. Fase 1: solo marca `isSent: true`.
 * 5. Devuelve el resumen de lo procesado.
 *
 * Nota: `@db.Date` y `@db.Time` se guardan en UTC, así que el disparo se
 * calcula en UTC. El filtro fino se hace en memoria porque el momento de
 * disparo depende de dos columnas distintas y no es expresable en el `where`.
 */
export const GET = withRoute(async ({ req }) => {
  assertCronSecret(req);

  const now = new Date();

  const pending = await prisma.calendarReminder.findMany({
    where: {
      isSent: false,
      // Cota amplia: nada que dispare ya puede tener el evento en el futuro
      // más allá del mayor `daysBefore` admitido (365).
      event: { date: { lte: addUtcDays(now, 365) } },
    },
    include: { event: true },
    orderBy: [{ id: "asc" }],
    take: BATCH_SIZE,
  });

  const due = pending.filter(
    (r) => reminderTriggerAt(r.event.date, r.remindTime, r.daysBefore).getTime() <= now.getTime()
  );

  const notifications: ReminderNotification[] = due.map((r) => ({
    reminderId: r.id,
    eventId: r.eventId,
    triggerAt: reminderTriggerAt(r.event.date, r.remindTime, r.daysBefore).toISOString(),
    message: buildMessage(r.event),
  }));

  for (const notification of notifications) {
    await dispatchNotification(notification);
  }

  if (due.length > 0) {
    await prisma.calendarReminder.updateMany({
      where: { id: { in: due.map((r) => r.id) } },
      data: { isSent: true },
    });
  }

  return ok({
    checked: pending.length,
    processed: due.length,
    ranAt: now.toISOString(),
    notifications,
  });
});
