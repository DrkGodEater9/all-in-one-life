import { withAuth } from "@/lib/auth";
import { ok } from "@/lib/http";
import { prisma } from "@/lib/db";
import { MEAL_TYPES, readDateParam, num, sumMacros } from "../_shared";

/**
 * GET /api/nutrition/log?date=YYYY-MM-DD
 * Comidas del día con sus items, en orden desayuno → almuerzo → cena → snacks.
 */
export const GET = withAuth(async ({ searchParams }) => {
  const { key, date } = readDateParam(searchParams);

  const meals = await prisma.nutritionMealLog.findMany({
    where: { date },
    include: { items: { orderBy: { createdAt: "asc" } } },
  });

  const order = new Map(MEAL_TYPES.map((t, i) => [t as string, i]));
  meals.sort(
    (a, b) => (order.get(a.mealType) ?? 99) - (order.get(b.mealType) ?? 99)
  );

  const payload = meals.map((meal) => {
    const items = meal.items.map((item) => ({
      id: item.id,
      mealLogId: item.mealLogId,
      foodName: item.foodName,
      foodCacheId: item.foodCacheId,
      favoriteId: item.favoriteId,
      amountG: num(item.amountG),
      state: item.state,
      kcal: num(item.kcal),
      proteinG: num(item.proteinG),
      carbsG: num(item.carbsG),
      fatG: num(item.fatG),
      isEstimated: item.isEstimated,
    }));

    return {
      id: meal.id,
      date: key,
      mealType: meal.mealType,
      items,
      totals: sumMacros(items),
    };
  });

  return ok({ date: key, meals: payload });
});
