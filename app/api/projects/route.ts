import { z } from "zod";
import { withAuth } from "@/lib/auth";
import { created, ok } from "@/lib/http";
import { prisma } from "@/lib/db";
import {
  assertCategoryExists,
  descriptionSchema,
  emptyToNull,
  projectFiltersSchema,
  projectInclude,
  projectWhere,
  queryObject,
  resolveTagIds,
  statusSchema,
  tagNameSchema,
  titleSchema,
  viabilitySchema,
} from "./_lib";

const createSchema = z.object({
  title: titleSchema,
  description: descriptionSchema.nullish(),
  status: statusSchema.default("idea"),
  // Fase 1 siempre manda null; el campo queda soportado para fase 2.
  viability: viabilitySchema.nullish(),
  categoryId: z.number().int().positive().nullish(),
  tagIds: z.array(z.number().int().positive()).optional(),
  tagNames: z.array(tagNameSchema).optional(),
});

/** GET /api/projects ?status=&category=&tag=&q= */
export const GET = withAuth(async ({ searchParams }) => {
  const filters = projectFiltersSchema.parse(queryObject(searchParams));

  const projects = await prisma.project.findMany({
    where: projectWhere(filters),
    include: projectInclude,
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
  });

  return ok(projects);
});

/** POST /api/projects */
export const POST = withAuth(async ({ req }) => {
  const data = createSchema.parse(await req.json());

  const project = await prisma.$transaction(async (tx) => {
    if (data.categoryId != null) await assertCategoryExists(tx, data.categoryId);
    const tagIds = await resolveTagIds(tx, data.tagIds, data.tagNames);

    return tx.project.create({
      data: {
        title: data.title,
        description: emptyToNull(data.description),
        status: data.status,
        viability: data.viability ?? null,
        categoryId: data.categoryId ?? null,
        tags: tagIds.length ? { create: tagIds.map((tagId) => ({ tagId })) } : undefined,
      },
      include: projectInclude,
    });
  });

  return created(project);
});
