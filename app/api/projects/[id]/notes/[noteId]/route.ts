import { withAuth } from "@/lib/auth";
import { notFound, ok } from "@/lib/http";
import { prisma } from "@/lib/db";
import { parseId } from "../../../_lib";

/** DELETE /api/projects/[id]/notes/[noteId] */
export const DELETE = withAuth<{ id: string; noteId: string }>(async ({ params }) => {
  const projectId = parseId(params.id);
  const noteId = parseId(params.noteId, "noteId");

  const note = await prisma.projectNote.findFirst({
    where: { id: noteId, projectId },
    select: { id: true },
  });
  if (!note) throw notFound("Nota no encontrada");

  await prisma.projectNote.delete({ where: { id: noteId } });
  return ok({ success: true });
});
