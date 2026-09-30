import { z } from "zod";
import { withAuth } from "@/lib/auth";
import { created, ok } from "@/lib/http";
import { prisma } from "@/lib/db";
import { categoryNameSchema } from "../_lib";

const createCategorySchema = z.object({ name: categoryNameSchema });

/** GET /api/projects/categories */
export const GET = withAuth(async () =>
  ok(await prisma.projectCategory.findMany({ orderBy: { name: "asc" } }))
);

/** POST /api/projects/categories — idempotente por nombre (case-insensitive). */
export const POST = withAuth(async ({ req }) => {
  const { name } = createCategorySchema.parse(await req.json());

  const existing = await prisma.projectCategory.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
  });
  if (existing) return ok(existing);

  return created(await prisma.projectCategory.create({ data: { name } }));
});
