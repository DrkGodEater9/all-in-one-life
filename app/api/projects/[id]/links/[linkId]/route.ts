import { withAuth } from "@/lib/auth";
import { notFound, ok } from "@/lib/http";
import { prisma } from "@/lib/db";
import { parseId } from "../../../_lib";

/** DELETE /api/projects/[id]/links/[linkId] */
export const DELETE = withAuth<{ id: string; linkId: string }>(async ({ params }) => {
  const projectId = parseId(params.id);
  const linkId = parseId(params.linkId, "linkId");

  const link = await prisma.projectLink.findFirst({
    where: { id: linkId, projectId },
    select: { id: true },
  });
  if (!link) throw notFound("Link no encontrado");

  await prisma.projectLink.delete({ where: { id: linkId } });
  return ok({ success: true });
});
