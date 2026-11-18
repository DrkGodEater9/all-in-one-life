import { withAuth } from "@/lib/auth";
import { created, ok } from "@/lib/http";
import { prisma } from "@/lib/db";
import { parseDateKey, toDateKey } from "@/lib/utils";
import { emptyToNull } from "../_lib";
import { applicationBodySchema, toApplicationDTO } from "./_schema";

/** GET /api/jobs/applications — las más recientes primero. */
export const GET = withAuth(async () => {
  const rows = await prisma.jobApplication.findMany({
    orderBy: [{ appliedAt: "desc" }, { id: "desc" }],
  });
  return ok(rows.map(toApplicationDTO));
});

/** POST /api/jobs/applications */
export const POST = withAuth(async ({ req }) => {
  const data = applicationBodySchema.parse(await req.json());
  const row = await prisma.jobApplication.create({
    data: {
      company: data.company,
      position: data.position,
      url: emptyToNull(data.url),
      source: emptyToNull(data.source),
      status: data.status ?? "postulado",
      appliedAt: parseDateKey(data.appliedAt ?? toDateKey()),
      salary: emptyToNull(data.salary),
      notes: emptyToNull(data.notes),
    },
  });
  return created(toApplicationDTO(row));
});
