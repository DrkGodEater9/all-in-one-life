/**
 * Helpers de Recetas. No es una route (Next solo expone `route.ts`).
 */
import { z } from "zod";
import { prisma } from "@/lib/db";
import { badRequest, notFound } from "@/lib/http";
import {
  foodStateSchema,
  isIncomplete,
  macrosFor,
  mealTypeSchema,
  num,
  numOrNull,
  sumMacros,
  type Per100g,
} from "../_shared";

const per100 = z.number().min(0).max(10000);

/** Un ingrediente: favorito, alimento de caché o alta manual (nombre + kcal/100 g). */
export const ingredientSchema = z
  .object({
    foodCacheId: z.number().int().positive().optional(),
    favoriteId: z.number().int().positive().optional(),
    foodName: z.string().trim().min(1).max(160).optional(),
    kcal100g: per100.optional(),
    protein100g: per100.optional(),
    carbs100g: per100.optional(),
    fat100g: per100.optional(),
    amountG: z.number().positive("Los gramos deben ser mayores que 0").max(10000),
    state: foodStateSchema.default("unknown"),
    /** Al editar una receta se reenvía el ingrediente como manual conservando su flag. */
    estimated: z.boolean().optional(),
    quantity: z.number().positive().max(100000).nullable().optional(),
    unit: z.string().trim().max(30).nullable().optional(),
    costCop: z.number().int().min(0).max(10_000_000).nullable().optional(),
    store: z.string().trim().max(80).nullable().optional(),
  })
  .refine(
    (b) =>
      b.foodCacheId !== undefined ||
      b.favoriteId !== undefined ||
      (b.foodName !== undefined && b.kcal100g !== undefined),
    {
      message: "Indica foodCacheId, favoriteId o bien foodName + kcal100g",
      path: ["foodName"],
    }
  );

const declaredMacrosSchema = z.object({
  kcal: z.number().min(0).max(10000),
  proteinG: z.number().min(0).max(1000),
  carbsG: z.number().min(0).max(1000),
  fatG: z.number().min(0).max(1000),
});

const stepSchema = z.object({
  text: z.string().trim().min(1).max(500),
  minutes: z.number().int().min(0).max(600).nullable().optional(),
});

export const recipeBodySchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio").max(120),
  mealType: mealTypeSchema.nullable().optional(),
  groupName: z.string().trim().max(80).nullable().optional(),
  description: z.string().trim().max(500).nullable().optional(),
  servings: z.number().int().min(1).max(50).optional(),
  prepMinutes: z.number().int().min(0).max(600).nullable().optional(),
  steps: z.array(stepSchema).max(40).optional(),
  storage: z.string().trim().max(300).nullable().optional(),
  fridgeDays: z.number().int().min(0).max(30).nullable().optional(),
  tips: z.array(z.string().trim().min(1).max(300)).max(20).optional(),
  /** Macros por porción declarados (recetas importadas); sustituyen la suma de ingredientes. */
  macros: declaredMacrosSchema.nullable().optional(),
  items: z.array(ingredientSchema).min(1, "Añade al menos un ingrediente").max(60),
});

export type IngredientInput = z.infer<typeof ingredientSchema>;

/** Resuelve los valores por 100 g en servidor y devuelve el item ya escalado. */
export async function resolveIngredient(input: IngredientInput) {
  let name = input.foodName ?? "";
  let per100g: Per100g = {
    kcal100g: input.kcal100g ?? null,
    protein100g: input.protein100g ?? null,
    carbs100g: input.carbs100g ?? null,
    fat100g: input.fat100g ?? null,
  };
  let backed = false;

  if (input.favoriteId !== undefined) {
    const favorite = await prisma.nutritionFavorite.findUnique({
      where: { id: input.favoriteId },
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
  } else if (input.foodCacheId !== undefined) {
    const food = await prisma.nutritionFoodCache.findUnique({
      where: { id: input.foodCacheId },
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

  if (!name) throw badRequest("El ingrediente necesita un nombre");

  const macros = macrosFor(per100g, input.amountG);
  return {
    foodName: name,
    amountG: input.amountG,
    state: input.state,
    kcal: macros.kcal,
    proteinG: macros.proteinG,
    carbsG: macros.carbsG,
    fatG: macros.fatG,
    isEstimated: input.estimated ?? (!backed || isIncomplete(per100g)),
    quantity: input.quantity ?? null,
    unit: input.unit ?? null,
    costCop: input.costCop ?? null,
    store: input.store ?? null,
  };
}

/** Campos de la receta (sin ingredientes) listos para `data` de Prisma. */
export function recipeData(body: z.infer<typeof recipeBodySchema>) {
  return {
    name: body.name,
    mealType: body.mealType ?? null,
    groupName: body.groupName || null,
    description: body.description || null,
    servings: body.servings ?? 1,
    prepMinutes: body.prepMinutes ?? null,
    steps: body.steps ?? [],
    storage: body.storage || null,
    fridgeDays: body.fridgeDays ?? null,
    tips: body.tips ?? [],
    kcal: body.macros?.kcal ?? null,
    proteinG: body.macros?.proteinG ?? null,
    carbsG: body.macros?.carbsG ?? null,
    fatG: body.macros?.fatG ?? null,
  };
}

type RecipeRow = {
  id: number;
  name: string;
  mealType: string | null;
  items: Array<{
    id: number;
    foodName: string;
    amountG: unknown;
    state: string;
    kcal: unknown;
    proteinG: unknown;
    carbsG: unknown;
    fatG: unknown;
    isEstimated: boolean;
    quantity?: unknown;
    unit?: string | null;
    costCop?: number | null;
    store?: string | null;
  }>;
  groupName?: string | null;
  description?: string | null;
  servings?: number;
  prepMinutes?: number | null;
  steps?: unknown;
  storage?: string | null;
  fridgeDays?: number | null;
  tips?: string[];
  costCop?: number | null;
  kcal?: unknown;
  proteinG?: unknown;
  carbsG?: unknown;
  fatG?: unknown;
};

/** Receta lista para el cliente, con los totales de todos sus ingredientes. */
export function toRecipePayload(recipe: RecipeRow) {
  const items = recipe.items.map((i) => ({
    id: i.id,
    foodName: i.foodName,
    amountG: num(i.amountG),
    state: i.state,
    kcal: num(i.kcal),
    proteinG: num(i.proteinG),
    carbsG: num(i.carbsG),
    fatG: num(i.fatG),
    isEstimated: i.isEstimated,
    quantity: numOrNull(i.quantity),
    unit: i.unit ?? null,
    costCop: i.costCop ?? null,
    store: i.store ?? null,
  }));
  const declared = recipe.kcal != null;
  const itemCost = items.reduce((t, i) => t + (i.costCop ?? 0), 0);
  return {
    id: recipe.id,
    name: recipe.name,
    mealType: recipe.mealType,
    groupName: recipe.groupName ?? null,
    description: recipe.description ?? null,
    servings: recipe.servings ?? 1,
    prepMinutes: recipe.prepMinutes ?? null,
    steps: Array.isArray(recipe.steps) ? recipe.steps : [],
    storage: recipe.storage ?? null,
    fridgeDays: recipe.fridgeDays ?? null,
    tips: recipe.tips ?? [],
    costCop: recipe.costCop ?? (itemCost > 0 ? itemCost : null),
    macrosDeclared: declared,
    items,
    totals: declared
      ? {
          kcal: num(recipe.kcal),
          proteinG: num(recipe.proteinG),
          carbsG: num(recipe.carbsG),
          fatG: num(recipe.fatG),
        }
      : sumMacros(items),
  };
}
