import { withAuth } from "@/lib/auth";
import { ok } from "@/lib/http";
import { prisma } from "@/lib/db";
import { getGoal, num, readDateParam, sumMacros } from "../_shared";

/**
 * GET /api/nutrition/summary?date=YYYY-MM-DD
 * Totales del día + meta vigente, para el header y las barras de macros.
 */
export const GET = withAuth(async ({ searchParams }) => {
  const { key, date } = readDateParam(searchParams);

  const [items, goal] = await Promise.all([
    prisma.nutritionMealItem.findMany({
      where: { mealLog: { date } },
      select: { kcal: true, proteinG: true, carbsG: true, fatG: true },
    }),
    getGoal(),
  ]);

  const totals = sumMacros(
    items.map((i) => ({
      kcal: num(i.kcal),
      proteinG: num(i.proteinG),
      carbsG: num(i.carbsG),
      fatG: num(i.fatG),
    }))
  );

  return ok({
    date: key,
    totals,
    goal,
    remaining: {
      kcal: Math.round((goal.kcal - totals.kcal) * 100) / 100,
      proteinG: Math.round((goal.proteinG - totals.proteinG) * 100) / 100,
      carbsG: Math.round((goal.carbsG - totals.carbsG) * 100) / 100,
      fatG: Math.round((goal.fatG - totals.fatG) * 100) / 100,
    },
    itemCount: items.length,
  });
});
