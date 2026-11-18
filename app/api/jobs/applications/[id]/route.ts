import { withAuth } from "@/lib/auth";
import { notFound, ok } from "@/lib/http";
import { prisma } from "@/lib/db";
import { parseDateKey } from "@/lib/utils";
import { emptyToNull, parseId } from "../../_lib";
import { applicationBodySchema, toApplicationDTO } from "../_schema";

const patchSchema = applicationBodySchema
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: "Nada que actualizar" });

async function assertExists(id: number) {
  if (!(await prisma.jobApplication.findUnique({ where: { id }, select: { id: true } }))) {
    throw notFound("Postulación no encontrada");
  }
}

/** PATCH /api/jobs/applications/[id] */
export const PATCH = withAuth<{ id: string }>(async ({ params, req }) => {
  const id = parseId(params.id);
  const data = patchSchema.parse(await req.json());
  await assertExists(id);

  const row = await prisma.jobApplication.update({
    where: { id },
    data: {
      ...(data.company !== undefined && { company: data.company }),
      ...(data.position !== undefined && { position: data.position }),
      ...(data.url !== undefined && { url: emptyToNull(data.url) }),
      ...(data.source !== undefined && { source: emptyToNull(data.source) }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.appliedAt !== undefined && { appliedAt: parseDateKey(data.appliedAt) }),
      ...(data.salary !== undefined && { salary: emptyToNull(data.salary) }),
      ...(data.notes !== undefined && { notes: emptyToNull(data.notes) }),
    },
  });
  return ok(toApplicationDTO(row));
});

/** DELETE /api/jobs/applications/[id] */
export const DELETE = withAuth<{ id: string }>(async ({ params }) => {
  const id = parseId(params.id);
  await assertExists(id);
  await prisma.jobApplication.delete({ where: { id } });
  return ok({ success: true });
});
