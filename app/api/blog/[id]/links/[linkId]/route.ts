import { withAuth } from "@/lib/auth";
import { notFound, ok } from "@/lib/http";
import { prisma } from "@/lib/db";
import { parseId } from "../../../_lib";

/** DELETE /api/blog/[id]/links/[linkId] */
export const DELETE = withAuth<{ id: string; linkId: string }>(async ({ params }) => {
  const postId = parseId(params.id);
  const linkId = parseId(params.linkId, "linkId");

  const link = await prisma.blogLink.findFirst({
    where: { id: linkId, postId },
    select: { id: true },
  });
  if (!link) throw notFound("Link no encontrado");

  await prisma.blogLink.delete({ where: { id: linkId } });
  return ok({ success: true });
});
