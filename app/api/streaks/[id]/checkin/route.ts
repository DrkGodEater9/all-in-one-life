import { z } from "zod";
import { withAuth } from "@/lib/auth";
import { ok } from "@/lib/http";
import { dateKeySchema, notFound, parseDateKey, parseId, prisma, withStats } from "../../_lib";

const bodySchema = z.object({
  date: dateKeySchema,
  done: z.boolean(),
});

/**
 * PUT /api/streaks/[id]/checkin — { date, done }
 * Marca (o desmarca) un día como cumplido. Idempotente. `date` lo manda el
 * cliente (su día local) para no depender del huso del servidor.
 */
export const PUT = withAuth<{ id: string }>(async ({ req, params }) => {
  const streakId = parseId(params.id);
  const { date, done } = bodySchema.parse(await req.json());
  const day = parseDateKey(date);

  const found = await prisma.streak.findUnique({ where: { id: streakId }, select: { id: true } });
  if (!found) throw notFound("La racha indicada no existe");

  if (done) {
    await prisma.streakCheckin.upsert({
      where: { streakId_date: { streakId, date: day } },
      create: { streakId, date: day },
      update: {},
    });
  } else {
    await prisma.streakCheckin.deleteMany({ where: { streakId, date: day } });
  }

  const row = await prisma.streak.findUniqueOrThrow({
    where: { id: streakId },
    include: { checkins: { select: { date: true } } },
  });
  return ok(withStats(row, date));
});
