import { withAuth } from "@/lib/auth";
import { ok } from "@/lib/http";
import { prisma } from "@/lib/db";
import { assertCreditLineExists, creditLineBalance, creditLineSchema, parseId } from "../../_lib";

/** GET /api/finance/credit-lines/[id] — detalle con movimientos e historial. */
export const GET = withAuth<{ id: string }>(async ({ params }) => {
  const id = parseId(params.id);
  await assertCreditLineExists(id);

  const line = await prisma.financeCreditLine.findUniqueOrThrow({
    where: { id },
    include: { movements: { orderBy: [{ date: "desc" }, { id: "desc" }] } },
  });

  const { movements, ...rest } = line;
  return ok({ ...rest, ...creditLineBalance(movements, line.creditLimit), movements });
});

/** PUT /api/finance/credit-lines/[id] — { name, creditLimit? } */
export const PUT = withAuth<{ id: string }>(async ({ req, params }) => {
  const id = parseId(params.id);
  await assertCreditLineExists(id);
  const data = creditLineSchema.parse(await req.json());

  const line = await prisma.financeCreditLine.update({
    where: { id },
    data: { name: data.name, creditLimit: data.creditLimit ?? null },
  });

  return ok(line);
});

/** DELETE /api/finance/credit-lines/[id] — borra la línea y sus movimientos. */
export const DELETE = withAuth<{ id: string }>(async ({ params }) => {
  const id = parseId(params.id);
  await assertCreditLineExists(id);

  await prisma.$transaction([
    prisma.financeCreditMovement.deleteMany({ where: { creditLineId: id } }),
    prisma.financeCreditLine.delete({ where: { id } }),
  ]);

  return ok({ success: true });
});
