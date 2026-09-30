import { withAuth } from "@/lib/auth";
import { ok, created } from "@/lib/http";
import { prisma } from "@/lib/db";
import { creditLineBalance, creditLineSchema } from "../_lib";

/**
 * GET /api/finance/credit-lines
 * Cada línea con su saldo calculado (usado/cupo/disponible) a partir de
 * todos sus movimientos.
 */
export const GET = withAuth(async () => {
  const lines = await prisma.financeCreditLine.findMany({
    include: { movements: { select: { type: true, amount: true } } },
    orderBy: { createdAt: "asc" },
  });

  return ok(
    lines.map(({ movements, ...line }) => ({
      ...line,
      ...creditLineBalance(movements, line.creditLimit),
    }))
  );
});

/** POST /api/finance/credit-lines — { name, creditLimit? } */
export const POST = withAuth(async ({ req }) => {
  const data = creditLineSchema.parse(await req.json());

  const line = await prisma.financeCreditLine.create({
    data: { name: data.name, creditLimit: data.creditLimit ?? null },
  });

  return created({ ...line, used: 0, limit: data.creditLimit ?? null, available: data.creditLimit ?? null });
});
