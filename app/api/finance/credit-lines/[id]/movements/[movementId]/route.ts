import { withAuth } from "@/lib/auth";
import { ok, notFound } from "@/lib/http";
import { prisma } from "@/lib/db";
import { assertCreditLineExists, parseId } from "../../../../_lib";

/** DELETE /api/finance/credit-lines/[id]/movements/[movementId] */
export const DELETE = withAuth<{ id: string; movementId: string }>(async ({ params }) => {
  const creditLineId = parseId(params.id);
  const movementId = parseId(params.movementId);
  await assertCreditLineExists(creditLineId);

  const movement = await prisma.financeCreditMovement.findUnique({ where: { id: movementId } });
  if (!movement || movement.creditLineId !== creditLineId) {
    throw notFound("El movimiento indicado no existe en esta línea de crédito");
  }

  await prisma.financeCreditMovement.delete({ where: { id: movementId } });
  return ok({ success: true });
});
