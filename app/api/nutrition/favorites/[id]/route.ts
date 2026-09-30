import { withAuth } from "@/lib/auth";
import { ok, badRequest, notFound } from "@/lib/http";
import { prisma } from "@/lib/db";

/** DELETE /api/nutrition/favorites/[id] */
export const DELETE = withAuth<{ id: string }>(async ({ params }) => {
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) throw badRequest("id inválido");

  const favorite = await prisma.nutritionFavorite.findUnique({ where: { id } });
  if (!favorite) throw notFound("Favorito no encontrado");

  // Los items ya registrados conservan sus macros; solo se suelta la referencia.
  await prisma.nutritionMealItem.updateMany({
    where: { favoriteId: id },
    data: { favoriteId: null },
  });
  await prisma.nutritionFavorite.delete({ where: { id } });

  return ok({ success: true });
});
