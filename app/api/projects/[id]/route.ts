import { z } from "zod";
import { withAuth } from "@/lib/auth";
import { notFound, ok } from "@/lib/http";
import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import {
  assertCategoryExists,
  assertProjectExists,
  descriptionSchema,
  emptyToNull,
  findProject,
  parseId,
  projectInclude,
  replaceTagAssignments,
  resolveTagIds,
  statusSchema,
  tagNameSchema,
  titleSchema,
  viabilitySchema,
} from "../_lib";

const optionalFields = {
  description: descriptionSchema.nullable().optional(),
  status: statusSchema.optional(),
  viability: viabilitySchema.nullable().optional(),
  categoryId: z.number().int().positive().nullable().optional(),
  tagIds: z.array(z.number().int().positive()).optional(),
  tagNames: z.array(tagNameSchema).optional(),
};

/** PUT: reemplazo — el título es obligatorio. */
const putSchema = z.object({ title: titleSchema, ...optionalFields });

/** PATCH: parche parcial — usado sobre todo por el kanban para mover de columna. */
const patchSchema = z
  .object({ title: titleSchema.optional(), ...optionalFields })
  .refine((v) => Object.keys(v).length > 0, { message: "Nada que actualizar" });

type ProjectPatch = z.infer<typeof patchSchema>;

async function applyUpdate(id: number, data: ProjectPatch) {
  return prisma.$transaction(async (tx) => {
    await assertProjectExists(tx, id);
    if (data.categoryId != null) await assertCategoryExists(tx, data.categoryId);

    const update: Prisma.ProjectUpdateInput = {};
    if (data.title !== undefined) update.title = data.title;
    if (data.description !== undefined) update.description = emptyToNull(data.description);
    if (data.status !== undefined) update.status = data.status;
    if (data.viability !== undefined) update.viability = data.viability;
    if (data.categoryId !== undefined) {
      update.category =
        data.categoryId === null ? { disconnect: true } : { connect: { id: data.categoryId } };
    }

    if (data.tagIds !== undefined || data.tagNames !== undefined) {
      const tagIds = await resolveTagIds(tx, data.tagIds, data.tagNames);
      await replaceTagAssignments(tx, id, tagIds);
    }

    return tx.project.update({ where: { id }, data: update, include: projectInclude });
  });
}

/** GET /api/projects/[id] */
export const GET = withAuth<{ id: string }>(async ({ params }) => {
  const id = parseId(params.id);
  const project = await findProject(id);
  if (!project) throw notFound("Proyecto no encontrado");
  return ok(project);
});

/** PUT /api/projects/[id] */
export const PUT = withAuth<{ id: string }>(async ({ params, req }) => {
  const id = parseId(params.id);
  const data = putSchema.parse(await req.json());
  return ok(await applyUpdate(id, data));
});

/** PATCH /api/projects/[id] — parche parcial (principalmente `status`). */
export const PATCH = withAuth<{ id: string }>(async ({ params, req }) => {
  const id = parseId(params.id);
  const data = patchSchema.parse(await req.json());
  return ok(await applyUpdate(id, data));
});

/**
 * DELETE /api/projects/[id]
 * El schema no declara onDelete: Cascade, así que se borra todo explícitamente
 * dentro de una transacción: notas, links y asignaciones de tags.
 */
export const DELETE = withAuth<{ id: string }>(async ({ params }) => {
  const id = parseId(params.id);

  await prisma.$transaction(async (tx) => {
    await assertProjectExists(tx, id);
    await tx.projectNote.deleteMany({ where: { projectId: id } });
    await tx.projectLink.deleteMany({ where: { projectId: id } });
    await tx.projectTagAssignment.deleteMany({ where: { projectId: id } });
    await tx.project.delete({ where: { id } });
  });

  return ok({ success: true });
});
