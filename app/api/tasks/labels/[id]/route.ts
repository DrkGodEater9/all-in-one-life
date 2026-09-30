import { withAuth } from "@/lib/auth";
import { notFound, ok } from "@/lib/http";
import { prisma } from "@/lib/db";
import { parseId } from "../../_lib";

/**
 * DELETE /api/tasks/labels/[id]
 * Borra la etiqueta y sus asignaciones (la tabla puente no tiene cascada en
 * el schema, así que se limpian a mano dentro de la transacción).
 */
export const DELETE = withAuth<{ id: string }>(async ({ params }) => {
  const id = parseId(params.id);

  const label = await prisma.taskLabel.findUnique({ where: { id } });
  if (!label) throw notFound("Etiqueta no encontrada");

  await prisma.$transaction([
    prisma.taskLabelAssignment.deleteMany({ where: { labelId: id } }),
    prisma.taskLabel.delete({ where: { id } }),
  ]);

  return ok({ success: true });
});
