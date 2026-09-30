import { z } from "zod";
import { withAuth } from "@/lib/auth";
import { ok, created } from "@/lib/http";
import { prisma } from "@/lib/db";
import { parseDateKey } from "@/lib/utils";
import {
  dateKeySchema,
  dbDateKey,
  num,
  shiftDateKey,
  todayKey,
} from "../_shared";

const querySchema = z.object({
  days: z.coerce.number().int().min(1).max(3650).optional(),
});

const bodySchema = z.object({
  weightKg: z.number().positive("El peso debe ser mayor que 0").max(500),
  date: dateKeySchema.optional(),
  notes: z.string().trim().max(280).nullable().optional(),
});

/** GET /api/nutrition/weight?days= — serie ascendente para la gráfica. */
export const GET = withAuth(async ({ searchParams }) => {
  const { days } = querySchema.parse({
    days: searchParams.get("days") ?? undefined,
  });

  const where =
    days !== undefined
      ? { date: { gte: parseDateKey(shiftDateKey(todayKey(), -(days - 1))) } }
      : {};

  const logs = await prisma.nutritionWeightLog.findMany({
    where,
    orderBy: { date: "asc" },
  });

  return ok(
    logs.map((l) => ({
      id: l.id,
      date: dbDateKey(l.date),
      weightKg: num(l.weightKg),
      notes: l.notes,
    }))
  );
});

/** POST /api/nutrition/weight — un registro por día: si ya hay, se actualiza. */
export const POST = withAuth(async ({ req }) => {
  const body = bodySchema.parse(await req.json());
  const key = body.date ?? todayKey();
  const date = parseDateKey(key);

  const existing = await prisma.nutritionWeightLog.findFirst({ where: { date } });

  const log = existing
    ? await prisma.nutritionWeightLog.update({
        where: { id: existing.id },
        data: { weightKg: body.weightKg, notes: body.notes ?? null },
      })
    : await prisma.nutritionWeightLog.create({
        data: { date, weightKg: body.weightKg, notes: body.notes ?? null },
      });

  const payload = {
    id: log.id,
    date: key,
    weightKg: num(log.weightKg),
    notes: log.notes,
  };
  return existing ? ok(payload) : created(payload);
});
