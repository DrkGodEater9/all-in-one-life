import { z } from "zod";
import { withAuth } from "@/lib/auth";
import { ok, created } from "@/lib/http";
import { prisma } from "@/lib/db";
import { parseDateKey } from "@/lib/utils";
import { dateKeySchema, mealTypeSchema, todayKey } from "../../_shared";

const bodySchema = z.object({
  date: dateKeySchema.optional(),
  mealType: mealTypeSchema,
});

/**
 * POST /api/nutrition/log/meal
 * Crea el `NutritionMealLog` de esa fecha y tipo, o reutiliza el existente.
 */
export const POST = withAuth(async ({ req }) => {
  const body = bodySchema.parse(await req.json());
  const key = body.date ?? todayKey();
  const date = parseDateKey(key);

  const existing = await prisma.nutritionMealLog.findFirst({
    where: { date, mealType: body.mealType },
  });
  if (existing) {
    return ok({ id: existing.id, date: key, mealType: existing.mealType });
  }

  const meal = await prisma.nutritionMealLog.create({
    data: { date, mealType: body.mealType },
  });
  return created({ id: meal.id, date: key, mealType: meal.mealType });
});
