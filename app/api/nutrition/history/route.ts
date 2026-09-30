import { z } from "zod";
import { withAuth } from "@/lib/auth";
import { ok } from "@/lib/http";
import { prisma } from "@/lib/db";
import { parseDateKey } from "@/lib/utils";
import {
  dateKeyRange,
  dbDateKey,
  num,
  round2,
  shiftDateKey,
  todayKey,
  type Macros,
} from "../_shared";

const querySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).default(30),
});

/**
 * GET /api/nutrition/history?days=30
 * Serie diaria continua (los días sin registro van en cero) para las gráficas.
 */
export const GET = withAuth(async ({ searchParams }) => {
  const { days } = querySchema.parse({
    days: searchParams.get("days") ?? undefined,
  });

  const to = todayKey();
  const from = shiftDateKey(to, -(days - 1));

  const meals = await prisma.nutritionMealLog.findMany({
    where: { date: { gte: parseDateKey(from), lte: parseDateKey(to) } },
    include: {
      items: { select: { kcal: true, proteinG: true, carbsG: true, fatG: true } },
    },
  });

  const byDay = new Map<string, Macros>();
  for (const meal of meals) {
    const key = dbDateKey(meal.date);
    const acc = byDay.get(key) ?? { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 };
    for (const item of meal.items) {
      acc.kcal += num(item.kcal);
      acc.proteinG += num(item.proteinG);
      acc.carbsG += num(item.carbsG);
      acc.fatG += num(item.fatG);
    }
    byDay.set(key, acc);
  }

  const series = dateKeyRange(from, to).map((date) => {
    const t = byDay.get(date);
    return {
      date,
      kcal: round2(t?.kcal ?? 0),
      proteinG: round2(t?.proteinG ?? 0),
      carbsG: round2(t?.carbsG ?? 0),
      fatG: round2(t?.fatG ?? 0),
    };
  });

  return ok({ from, to, days, series });
});
