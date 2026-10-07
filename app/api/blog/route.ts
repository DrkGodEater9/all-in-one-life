import { z } from "zod";
import { withAuth } from "@/lib/auth";
import { created, ok } from "@/lib/http";
import { prisma } from "@/lib/db";
import {
  blogContentSchema,
  blogFiltersSchema,
  blogInclude,
  blogTitleSchema,
  blogWhere,
  queryObject,
  tagsSchema,
} from "./_lib";

const createSchema = z.object({
  title: blogTitleSchema,
  content: blogContentSchema.default(""),
  tags: tagsSchema.default([]),
  pinned: z.boolean().optional(),
});

/** GET /api/blog?q=&tag= — fijadas primero, luego las más recientes. */
export const GET = withAuth(async ({ searchParams }) => {
  const filters = blogFiltersSchema.parse(queryObject(searchParams));
  const posts = await prisma.blogPost.findMany({
    where: blogWhere(filters),
    include: blogInclude,
    orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
  });
  return ok(posts);
});

/** POST /api/blog */
export const POST = withAuth(async ({ req }) => {
  const data = createSchema.parse(await req.json());
  const post = await prisma.blogPost.create({ data, include: blogInclude });
  return created(post);
});
