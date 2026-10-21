import { withAuth } from "@/lib/auth";
import { ok, created } from "@/lib/http";
import { prisma } from "@/lib/db";
import { recipeBodySchema, recipeData, resolveIngredient, toRecipePayload } from "./_lib";

/** GET /api/nutrition/recipes */
export const GET = withAuth(async () => {
  const recipes = await prisma.nutritionRecipe.findMany({
    orderBy: { id: "asc" },
    include: { items: { orderBy: { id: "asc" } } },
  });
  return ok(recipes.map(toRecipePayload));
});

/** POST /api/nutrition/recipes */
export const POST = withAuth(async ({ req }) => {
  const body = recipeBodySchema.parse(await req.json());
  const items = await Promise.all(body.items.map(resolveIngredient));

  const recipe = await prisma.nutritionRecipe.create({
    data: {
      ...recipeData(body),
      items: { create: items },
    },
    include: { items: { orderBy: { id: "asc" } } },
  });
  return created(toRecipePayload(recipe));
});
