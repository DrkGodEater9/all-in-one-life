import { z } from "zod";
import { withAuth } from "@/lib/auth";
import { notFound, ok } from "@/lib/http";
import { prisma } from "@/lib/db";
import { definitionSchema, emptyToNull, parseId, termSchema, topicSchema } from "../_lib";

const patchSchema = z
  .object({
    term: termSchema.optional(),
    definition: definitionSchema.optional(),
    topic: topicSchema.nullable().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "Nada que actualizar" });

async function assertExists(id: number) {
  const found = await prisma.concept.findUnique({ where: { id }, select: { id: true } });
  if (!found) throw notFound("Concepto no encontrado");
}

/** PATCH /api/concepts/[id] */
export const PATCH = withAuth<{ id: string }>(async ({ params, req }) => {
  const id = parseId(params.id);
  const data = patchSchema.parse(await req.json());
  await assertExists(id);

  const concept = await prisma.concept.update({
    where: { id },
    data: {
      ...(data.term !== undefined && { term: data.term }),
      ...(data.definition !== undefined && { definition: data.definition }),
      ...(data.topic !== undefined && { topic: emptyToNull(data.topic) }),
    },
  });
  return ok(concept);
});

/** DELETE /api/concepts/[id] */
export const DELETE = withAuth<{ id: string }>(async ({ params }) => {
  const id = parseId(params.id);
  await assertExists(id);
  await prisma.concept.delete({ where: { id } });
  return ok({ success: true });
});
