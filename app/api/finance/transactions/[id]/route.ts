import { withAuth } from "@/lib/auth";
import { notFound, ok } from "@/lib/http";
import { prisma } from "@/lib/db";
import { balanceDelta, num, parseId } from "../../_lib";

/**
 * DELETE /api/finance/transactions/[id]
 * Borra la transacción y revierte su efecto sobre el balance de la fuente,
 * todo dentro de la misma transacción de base de datos.
 */
export const DELETE = withAuth<{ id: string }>(async ({ params }) => {
  const id = parseId(params.id);

  await prisma.$transaction(async (tx) => {
    const transaction = await tx.financeTransaction.findUnique({ where: { id } });
    if (!transaction) throw notFound("Transacción no encontrada");

    const delta = balanceDelta(transaction.type, num(transaction.amount));

    await tx.financeTransaction.delete({ where: { id } });
    await tx.financeSource.update({
      where: { id: transaction.sourceId },
      data: { balance: { increment: -delta } },
    });
  });

  return ok({ success: true });
});
