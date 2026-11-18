import { withAuth } from "@/lib/auth";
import { notFound, ok } from "@/lib/http";
import { prisma } from "@/lib/db";
import { parseId } from "../../projects/_lib";

/** DELETE /api/tokens/[id] — revoca el token (solo con sesión de navegador). */
export const DELETE = withAuth<{ id: string }>(
  async ({ params }) => {
    const id = parseId(params.id);
    const found = await prisma.apiToken.findUnique({ where: { id }, select: { id: true } });
    if (!found) throw notFound("Token no encontrado");
    await prisma.apiToken.delete({ where: { id } });
    return ok({ success: true });
  },
  { sessionOnly: true }
);
