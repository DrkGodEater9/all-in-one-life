import { z } from "zod";
import { withAuth } from "@/lib/auth";
import { created, badRequest, notFound } from "@/lib/http";
import { prisma } from "@/lib/db";
import { parseDateKey } from "@/lib/utils";
import {
  dateKeySchema,
  mealTypeSchema,
  num,
  round2,
  todayKey,
} from "../../../_shared";

const bodySchema = z.object({
  date: dateKeySchema.optional(),
  mealType: mealTypeSchema,
  /** Porciones comidas: 1 = receta completa, 0.5 = la mitad. */
  servings: z.number().positive("Las porciones deben ser mayores que 0").max(20).default(1),
});

/**
 * POST /api/nutrition/recipes/[id]/log
 * "Hoy comí esto": copia los ingredientes de la receta (escalados por porciones)
 * a la comida del día indicada.
 */
export const POST = withAuth<{ id: string }>(async ({ req, params }) => {
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) throw badRequest("id inválido");

  const body = bodySchema.parse(await req.json());
  const key = body.date ?? todayKey();
  const date = parseDateKey(key);

  const recipe = await prisma.nutritionRecipe.findUnique({
    where: { id },
    include: { items: { orderBy: { id: "asc" } } },
  });
  if (!recipe) throw notFound("Receta no encontrada");

  const k = body.servings;

  const meal = await prisma.$transaction(async (tx) => {
    const existing = await tx.nutritionMealLog.findFirst({
      where: { date, mealType: body.mealType },
    });
    const log =
      existing ??
      (await tx.nutritionMealLog.create({
        data: { date, mealType: body.mealType },
      }));

    // Recetas con macros declarados: un único renglón con los macros por porción.
    const declared = recipe.kcal != null;
    await tx.nutritionMealItem.createMany({
      data: declared
        ? [
            {
              mealLogId: log.id,
              foodName: recipe.name,
              amountG: round2(recipe.items.reduce((t, i) => t + num(i.amountG), 0) * k),
              state: "unknown",
              kcal: round2(num(recipe.kcal) * k),
              proteinG: round2(num(recipe.proteinG) * k),
              carbsG: round2(num(recipe.carbsG) * k),
              fatG: round2(num(recipe.fatG) * k),
              isEstimated: true,
            },
          ]
        : recipe.items.map((i) => ({
        mealLogId: log.id,
        foodName: i.foodName,
        amountG: round2(num(i.amountG) * k),
        state: i.state,
        kcal: round2(num(i.kcal) * k),
        proteinG: round2(num(i.proteinG) * k),
        carbsG: round2(num(i.carbsG) * k),
        fatG: round2(num(i.fatG) * k),
        isEstimated: i.isEstimated,
      })),
    });
    return log;
  });

  return created({
    mealLogId: meal.id,
    date: key,
    mealType: body.mealType,
    itemsAdded: recipe.kcal != null ? 1 : recipe.items.length,
  });
});
