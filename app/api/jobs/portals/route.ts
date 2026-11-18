import { withAuth } from "@/lib/auth";
import { created, ok } from "@/lib/http";
import { prisma } from "@/lib/db";
import { emptyToNull } from "../_lib";
import { portalBodySchema } from "./_schema";

/** GET /api/jobs/portals */
export const GET = withAuth(async () => {
  const portals = await prisma.jobPortal.findMany({ orderBy: [{ name: "asc" }] });
  return ok(portals.map(({ userId: _userId, ...rest }) => rest));
});

/** POST /api/jobs/portals */
export const POST = withAuth(async ({ req }) => {
  const data = portalBodySchema.parse(await req.json());
  const { userId: _userId, ...portal } = await prisma.jobPortal.create({
    data: {
      name: data.name,
      url: emptyToNull(data.url),
      account: emptyToNull(data.account),
      status: data.status ?? "pendiente",
      notes: emptyToNull(data.notes),
    },
  });
  return created(portal);
});
