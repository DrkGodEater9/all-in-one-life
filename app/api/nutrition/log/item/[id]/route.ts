import { withAuth } from "@/lib/auth";
import { ok, badRequest, notFound } from "@/lib/http";
import { prisma } from "@/lib/db";

/** DELETE /api/nutrition/log/item/[id] */
export const DELETE = withAuth<{ id: string }>(async ({ params }) => {
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) throw badRequest("id inválido");

  const item = await prisma.nutritionMealItem.findUnique({ where: { id } });
  if (!item) throw notFound("Item no encontrado");

  await prisma.nutritionMealItem.delete({ where: { id } });

  // Una comida sin items no aporta nada: se limpia para no ensuciar el día.
  const remaining = await prisma.nutritionMealItem.count({
    where: { mealLogId: item.mealLogId },
  });
  if (remaining === 0) {
    await prisma.nutritionMealLog.delete({ where: { id: item.mealLogId } });
  }

  return ok({ success: true });
});
