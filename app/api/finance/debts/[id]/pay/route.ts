import { z } from "zod";
import { withAuth } from "@/lib/auth";
import { badRequest, created, notFound } from "@/lib/http";
import { prisma } from "@/lib/db";
import {
  amountSchema,
  dateKeySchema,
  money,
  num,
  parseDateKey,
  parseId,
  toDateKey,
} from "../../../_lib";

const bodySchema = z.object({
  amount: amountSchema,
  date: dateKeySchema.optional(),
});

/**
 * POST /api/finance/debts/[id]/pay
 * Registra un pago, incrementa `amountPaid` y marca `isSettled` cuando
 * `amountPaid >= amount`. Todo atómico. Rechaza pagos que excedan el pendiente.
 */
export const POST = withAuth<{ id: string }>(async ({ req, params }) => {
  const id = parseId(params.id);
  const body = bodySchema.parse(await req.json());
  const amount = money(body.amount);

  const result = await prisma.$transaction(async (tx) => {
    const debt = await tx.financeDebt.findUnique({ where: { id } });
    if (!debt) throw notFound("Deuda no encontrada");
    if (debt.isSettled) throw badRequest("Esta deuda ya está saldada");

    const total = num(debt.amount);
    const paid = num(debt.amountPaid);
    const pending = money(total - paid);

    if (amount > pending) {
      throw badRequest(
        `El pago excede el saldo pendiente (${pending})`,
        { pending }
      );
    }

    const payment = await tx.financeDebtPayment.create({
      data: {
        debtId: id,
        amount,
        date: parseDateKey(body.date ?? toDateKey()),
      },
    });

    // `increment` en vez de escribir `paid + amount` a mano: bajo Read
    // Committed (el nivel por defecto de Postgres/Prisma), dos pagos
    // concurrentes sobre la misma deuda podían leer el mismo `paid`, los
    // dos pasar la validación, y el segundo `update` con el valor absoluto
    // pisaba por completo el efecto del primero — la deuda quedaba con
    // menos abonado de lo que realmente se pagó (el historial de pagos sí
    // mostraba ambos, pero `amountPaid` solo reflejaba el último). Un
    // increment es conmutativo a nivel de base de datos: el orden de
    // commit ya no importa, el total final es correcto sin importar cuál
    // transacción gane la carrera.
    const afterIncrement = await tx.financeDebt.update({
      where: { id },
      data: { amountPaid: { increment: amount } },
    });
    const nextPaid = num(afterIncrement.amountPaid);

    const updated = await tx.financeDebt.update({
      where: { id },
      data: { isSettled: nextPaid >= total },
      include: { source: true, _count: { select: { payments: true } } },
    });

    return { payment, debt: updated };
  });

  return created(result);
});
