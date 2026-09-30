import { z } from "zod";
import { withAuth } from "@/lib/auth";
import { created } from "@/lib/http";
import { prisma } from "@/lib/db";
import { assertProjectExists, parseId } from "../../_lib";

const createNoteSchema = z.object({
  content: z.string().trim().min(1, "La nota no puede estar vacía").max(5000),
});

/** POST /api/projects/[id]/notes — las notas solo se crean y se borran. */
export const POST = withAuth<{ id: string }>(async ({ params, req }) => {
  const projectId = parseId(params.id);
  const data = createNoteSchema.parse(await req.json());

  const note = await prisma.$transaction(async (tx) => {
    await assertProjectExists(tx, projectId);
    return tx.projectNote.create({ data: { projectId, content: data.content } });
  });

  return created(note);
});
