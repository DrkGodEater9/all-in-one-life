import { z } from "zod";
import { withAuth } from "@/lib/auth";
import { notFound, ok } from "@/lib/http";
import { prisma } from "@/lib/db";
import {
  assertPostExists,
  blogContentSchema,
  blogInclude,
  blogTitleSchema,
  findPost,
  parseId,
  tagsSchema,
} from "../_lib";

const patchSchema = z
  .object({
    title: blogTitleSchema.optional(),
    content: blogContentSchema.optional(),
    tags: tagsSchema.optional(),
    pinned: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "Nada que actualizar" });

/** GET /api/blog/[id] */
export const GET = withAuth<{ id: string }>(async ({ params }) => {
  const post = await findPost(parseId(params.id));
  if (!post) throw notFound("Entrada no encontrada");
  return ok(post);
});

/** PATCH /api/blog/[id] */
export const PATCH = withAuth<{ id: string }>(async ({ params, req }) => {
  const id = parseId(params.id);
  const data = patchSchema.parse(await req.json());

  const post = await prisma.$transaction(async (tx) => {
    await assertPostExists(tx, id);
    return tx.blogPost.update({ where: { id }, data, include: blogInclude });
  });
  return ok(post);
});

/** DELETE /api/blog/[id] — los links se borran en cascada. */
export const DELETE = withAuth<{ id: string }>(async ({ params }) => {
  const id = parseId(params.id);
  await prisma.$transaction(async (tx) => {
    await assertPostExists(tx, id);
    await tx.blogPost.delete({ where: { id } });
  });
  return ok({ success: true });
});
