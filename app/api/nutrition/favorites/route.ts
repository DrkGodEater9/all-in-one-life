import { z } from "zod";
import { withAuth } from "@/lib/auth";
import { ok, created } from "@/lib/http";
import { prisma } from "@/lib/db";

const macro = z.number().min(0).max(10000);

const bodySchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio").max(120),
  kcal100g: macro,
  protein100g: macro,
  carbs100g: macro,
  fat100g: macro,
  defaultUnit: z.enum(["g", "ml", "unit"]).default("g"),
  kcalPerUnit: macro.nullable().optional(),
});

/** GET /api/nutrition/favorites */
export const GET = withAuth(async () => {
  const favorites = await prisma.nutritionFavorite.findMany({
    orderBy: { name: "asc" },
  });
  return ok(favorites);
});

/** POST /api/nutrition/favorites */
export const POST = withAuth(async ({ req }) => {
  const data = bodySchema.parse(await req.json());
  const favorite = await prisma.nutritionFavorite.create({
    data: {
      name: data.name,
      kcal100g: data.kcal100g,
      protein100g: data.protein100g,
      carbs100g: data.carbs100g,
      fat100g: data.fat100g,
      defaultUnit: data.defaultUnit,
      kcalPerUnit: data.kcalPerUnit ?? null,
    },
  });
  return created(favorite);
});
