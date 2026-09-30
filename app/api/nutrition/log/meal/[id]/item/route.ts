import { z } from "zod";
import { withAuth } from "@/lib/auth";
import { created, badRequest, notFound } from "@/lib/http";
import { prisma } from "@/lib/db";
import {
  foodStateSchema,
  isIncomplete,
  macrosFor,
  num,
  numOrNull,
  type Per100g,
} from "../../../../_shared";

const per100 = z.number().min(0).max(10000);

const bodySchema = z
  .object({
    foodCacheId: z.number().int().positive().optional(),
    favoriteId: z.number().int().positive().optional(),
    /** Alta manual o etiqueta que sobrescribe el nombre del alimento. */
    foodName: z.string().trim().min(1).max(160).optional(),
    kcal100g: per100.optional(),
    protein100g: per100.optional(),
    carbs100g: per100.optional(),
    fat100g: per100.optional(),
    amountG: z.number().positive("Los gramos deben ser mayores que 0").max(10000),
    state: foodStateSchema.default("unknown"),
  })
  .refine(
    (b) =>
      b.foodCacheId !== undefined ||
      b.favoriteId !== undefined ||
      (b.foodName !== undefined && b.kcal100g !== undefined),
    {
      message:
        "Indica foodCacheId, favoriteId o bien foodName + kcal100g",
      path: ["foodName"],
    }
  );

/**
 * POST /api/nutrition/log/meal/[id]/item
 * El servidor resuelve los valores por 100 g y persiste los macros ya escalados.
 */
export const POST = withAuth<{ id: string }>(async ({ req, params }) => {
  const mealLogId = Number(params.id);
  if (!Number.isInteger(mealLogId)) throw badRequest("id de comida inválido");

  const body = bodySchema.parse(await req.json());

  const meal = await prisma.nutritionMealLog.findUnique({
    where: { id: mealLogId },
  });
  if (!meal) throw notFound("Comida no encontrada");

  let name = body.foodName ?? "";
  let per100g: Per100g = {
    kcal100g: body.kcal100g ?? null,
    protein100g: body.protein100g ?? null,
    carbs100g: body.carbs100g ?? null,
    fat100g: body.fat100g ?? null,
  };
  // Sin respaldo en catálogo => el dato es una estimación del usuario.
  let backed = false;

  if (body.favoriteId !== undefined) {
    const favorite = await prisma.nutritionFavorite.findUnique({
      where: { id: body.favoriteId },
    });
    if (!favorite) throw notFound("Favorito no encontrado");
    name = name || favorite.name;
    per100g = {
      kcal100g: num(favorite.kcal100g),
      protein100g: num(favorite.protein100g),
      carbs100g: num(favorite.carbs100g),
      fat100g: num(favorite.fat100g),
    };
    backed = true;
  } else if (body.foodCacheId !== undefined) {
    const food = await prisma.nutritionFoodCache.findUnique({
      where: { id: body.foodCacheId },
    });
    if (!food) throw notFound("Alimento no encontrado");
    name = name || food.name;
    per100g = {
      kcal100g: numOrNull(food.kcal100g),
      protein100g: numOrNull(food.protein100g),
      carbs100g: numOrNull(food.carbs100g),
      fat100g: numOrNull(food.fat100g),
    };
    backed = true;
  }

  if (!name) throw badRequest("El alimento necesita un nombre");

  const macros = macrosFor(per100g, body.amountG);
  const isEstimated = !backed || isIncomplete(per100g);

  const item = await prisma.nutritionMealItem.create({
    data: {
      mealLogId,
      foodName: name,
      foodCacheId: body.foodCacheId ?? null,
      favoriteId: body.favoriteId ?? null,
      amountG: body.amountG,
      state: body.state,
      kcal: macros.kcal,
      proteinG: macros.proteinG,
      carbsG: macros.carbsG,
      fatG: macros.fatG,
      isEstimated,
    },
  });

  return created(item);
});
