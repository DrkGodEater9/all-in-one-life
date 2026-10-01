import { withAuth } from "@/lib/auth";
import { ok } from "@/lib/http";
import { notFound, parseId, prisma } from "../_lib";

/** DELETE /api/streaks/[id] — borra la racha y sus check-ins (cascada). */
export const DELETE = withAuth<{ id: string }>(async ({ params }) => {
  const id = parseId(params.id);
  const found = await prisma.streak.findUnique({ where: { id }, select: { id: true } });
  if (!found) throw notFound("La racha indicada no existe");
  await prisma.streak.delete({ where: { id } });
  return ok({ success: true });
});
