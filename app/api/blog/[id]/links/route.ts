import { z } from "zod";
import { withAuth } from "@/lib/auth";
import { created } from "@/lib/http";
import { prisma } from "@/lib/db";
import { assertPostExists, emptyToNull, parseId, urlSchema } from "../../_lib";

const createLinkSchema = z.object({
  title: z.string().trim().max(120).nullable().optional(),
  url: urlSchema,
});

/** POST /api/blog/[id]/links */
export const POST = withAuth<{ id: string }>(async ({ params, req }) => {
  const postId = parseId(params.id);
  const data = createLinkSchema.parse(await req.json());

  const link = await prisma.$transaction(async (tx) => {
    await assertPostExists(tx, postId);
    return tx.blogLink.create({
      data: { postId, title: emptyToNull(data.title), url: data.url },
    });
  });
  return created(link);
});
