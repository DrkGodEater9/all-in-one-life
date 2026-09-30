import { z } from "zod";
import { withAuth } from "@/lib/auth";
import { created, ok } from "@/lib/http";
import { prisma } from "@/lib/db";
import { parseDateKey } from "@/lib/utils";
import {
  DEFAULT_WATER_AMOUNT_ML,
  DEFAULT_WATER_GOAL_ML,
  dateKeySchema,
  readDateParam,
  todayKey,
} from "../_shared";

const bodySchema = z.object({
  amountMl: z.number().int().min(1).max(5000).default(DEFAULT_WATER_AMOUNT_ML),
  date: dateKeySchema.optional(),
});

async function dayTotal(date: Date) {
  const agg = await prisma.nutritionWaterLog.aggregate({
    where: { date },
    _sum: { amountMl: true },
  });
  return agg._sum.amountMl ?? 0;
}

/** GET /api/nutrition/water?date= — total del día y sus registros. */
export const GET = withAuth(async ({ searchParams }) => {
  const { key, date } = readDateParam(searchParams);

  const [logs, totalMl] = await Promise.all([
    prisma.nutritionWaterLog.findMany({
      where: { date },
      orderBy: { createdAt: "asc" },
    }),
    dayTotal(date),
  ]);

  return ok({
    date: key,
    totalMl,
    goalMl: DEFAULT_WATER_GOAL_ML,
    logs: logs.map((l) => ({
      id: l.id,
      amountMl: l.amountMl,
      createdAt: l.createdAt.toISOString(),
    })),
  });
});

/** POST /api/nutrition/water — agrega un vaso (250 ml por defecto). */
export const POST = withAuth(async ({ req }) => {
  const raw = await req.json().catch(() => ({}));
  const body = bodySchema.parse(raw ?? {});
  const key = body.date ?? todayKey();
  const date = parseDateKey(key);

  await prisma.nutritionWaterLog.create({
    data: { date, amountMl: body.amountMl },
  });

  return created({
    date: key,
    totalMl: await dayTotal(date),
    goalMl: DEFAULT_WATER_GOAL_ML,
  });
});
