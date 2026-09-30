import { withAuth } from "@/lib/auth";
import { notFound, ok } from "@/lib/http";
import { prisma } from "@/lib/db";
import { parseId } from "../../../_lib";

/** GET /api/finance/debts/[id]/payments → historial de pagos, más reciente primero. */
export const GET = withAuth<{ id: string }>(async ({ params }) => {
  const id = parseId(params.id);

  const debt = await prisma.financeDebt.findUnique({ where: { id } });
  if (!debt) throw notFound("Deuda no encontrada");

  const payments = await prisma.financeDebtPayment.findMany({
    where: { debtId: id },
    orderBy: [{ date: "desc" }, { id: "desc" }],
  });

  return ok(payments);
});
