import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { notFound } from "@/lib/http";

export { parseId, emptyToNull, queryObject, urlSchema } from "../projects/_lib";

export const blogTitleSchema = z.string().trim().min(1, "El título es obligatorio").max(200);
export const blogContentSchema = z.string().trim().max(50000);

/** Etiquetas: sin vacías ni repetidas (sin distinguir mayúsculas), máx. 10. */
export const tagsSchema = z
  .array(z.string().trim().min(1).max(50))
  .max(10, "Máximo 10 etiquetas")
  .transform((tags) => {
    const seen = new Set<string>();
    return tags.filter((t) => {
      const key = t.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  });

export const blogFiltersSchema = z.object({
  q: z.string().trim().min(1).optional(),
  tag: z.string().trim().min(1).optional(),
});

export const blogInclude = {
  links: { orderBy: { createdAt: "asc" } },
} satisfies Prisma.BlogPostInclude;

export function blogWhere(filters: z.infer<typeof blogFiltersSchema>): Prisma.BlogPostWhereInput {
  const where: Prisma.BlogPostWhereInput = {};
  if (filters.tag) where.tags = { has: filters.tag };
  if (filters.q) {
    where.OR = [
      { title: { contains: filters.q, mode: "insensitive" } },
      { content: { contains: filters.q, mode: "insensitive" } },
    ];
  }
  return where;
}

export async function assertPostExists(db: Prisma.TransactionClient, id: number) {
  const post = await db.blogPost.findUnique({ where: { id }, select: { id: true } });
  if (!post) throw notFound("Entrada no encontrada");
}

export function findPost(id: number) {
  return prisma.blogPost.findUnique({ where: { id }, include: blogInclude });
}
