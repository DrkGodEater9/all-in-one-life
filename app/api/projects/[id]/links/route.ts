import { z } from "zod";
import { withAuth } from "@/lib/auth";
import { created } from "@/lib/http";
import { prisma } from "@/lib/db";
import { assertProjectExists, emptyToNull, parseId, urlSchema } from "../../_lib";

const createLinkSchema = z.object({
  title: z.string().trim().max(120).nullish(),
  url: urlSchema,
});

/** POST /api/projects/[id]/links */
export const POST = withAuth<{ id: string }>(async ({ params, req }) => {
  const projectId = parseId(params.id);
  const data = createLinkSchema.parse(await req.json());

  const link = await prisma.$transaction(async (tx) => {
    await assertProjectExists(tx, projectId);
    return tx.projectLink.create({
      data: { projectId, title: emptyToNull(data.title), url: data.url },
    });
  });

  return created(link);
});
