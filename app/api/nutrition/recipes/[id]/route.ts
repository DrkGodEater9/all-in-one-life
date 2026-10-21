import { withAuth } from "@/lib/auth";
import { ok, badRequest, notFound } from "@/lib/http";
import { prisma } from "@/lib/db";
import { recipeBodySchema, recipeData, resolveIngredient, toRecipePayload } from "../_lib";

function parseId(raw: string) {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) throw badRequest("id inválido");
  return id;
}

/** PUT /api/nutrition/recipes/[id] — reemplaza nombre, tipo e ingredientes. */
export const PUT = withAuth<{ id: string }>(async ({ req, params }) => {
  const id = parseId(params.id);
  const body = recipeBodySchema.parse(await req.json());

  const existing = await prisma.nutritionRecipe.findUnique({ where: { id } });
  if (!existing) throw notFound("Receta no encontrada");

  const items = await Promise.all(body.items.map(resolveIngredient));

  const recipe = await prisma.$transaction(async (tx) => {
    await tx.nutritionRecipeItem.deleteMany({ where: { recipeId: id } });
    return tx.nutritionRecipe.update({
      where: { id },
      data: {
        ...recipeData(body),
        items: { create: items },
      },
      include: { items: { orderBy: { id: "asc" } } },
    });
  });
  return ok(toRecipePayload(recipe));
});

/** DELETE /api/nutrition/recipes/[id] — los registros ya hechos no se tocan. */
export const DELETE = withAuth<{ id: string }>(async ({ params }) => {
  const id = parseId(params.id);

  const existing = await prisma.nutritionRecipe.findUnique({ where: { id } });
  if (!existing) throw notFound("Receta no encontrada");

  await prisma.nutritionRecipe.delete({ where: { id } });
  return ok({ success: true });
});
