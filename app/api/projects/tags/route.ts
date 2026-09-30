import { z } from "zod";
import { withAuth } from "@/lib/auth";
import { created, ok } from "@/lib/http";
import { prisma } from "@/lib/db";
import { tagNameSchema } from "../_lib";

const createTagSchema = z.object({ name: tagNameSchema });

/** GET /api/projects/tags */
export const GET = withAuth(async () =>
  ok(await prisma.projectTag.findMany({ orderBy: { name: "asc" } }))
);

/** POST /api/projects/tags — idempotente por nombre (case-insensitive). */
export const POST = withAuth(async ({ req }) => {
  const { name } = createTagSchema.parse(await req.json());

  const existing = await prisma.projectTag.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
  });
  if (existing) return ok(existing);

  return created(await prisma.projectTag.create({ data: { name } }));
});
