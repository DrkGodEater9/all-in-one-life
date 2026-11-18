import { withAuth } from "@/lib/auth";
import { notFound, ok } from "@/lib/http";
import { prisma } from "@/lib/db";
import { emptyToNull, parseId } from "../../_lib";
import { portalBodySchema } from "../_schema";

const patchSchema = portalBodySchema
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: "Nada que actualizar" });

async function assertExists(id: number) {
  if (!(await prisma.jobPortal.findUnique({ where: { id }, select: { id: true } }))) {
    throw notFound("Portal no encontrado");
  }
}

/** PATCH /api/jobs/portals/[id] */
export const PATCH = withAuth<{ id: string }>(async ({ params, req }) => {
  const id = parseId(params.id);
  const data = patchSchema.parse(await req.json());
  await assertExists(id);

  const { userId: _userId, ...portal } = await prisma.jobPortal.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.url !== undefined && { url: emptyToNull(data.url) }),
      ...(data.account !== undefined && { account: emptyToNull(data.account) }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.notes !== undefined && { notes: emptyToNull(data.notes) }),
    },
  });
  return ok(portal);
});

/** DELETE /api/jobs/portals/[id] */
export const DELETE = withAuth<{ id: string }>(async ({ params }) => {
  const id = parseId(params.id);
  await assertExists(id);
  await prisma.jobPortal.delete({ where: { id } });
  return ok({ success: true });
});
