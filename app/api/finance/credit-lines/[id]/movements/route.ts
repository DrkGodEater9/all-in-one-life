import { withAuth } from "@/lib/auth";
import { badRequest, created, notFound } from "@/lib/http";
import { prisma } from "@/lib/db";
import { creditLineBalance, creditMovementSchema, parseDateKey, parseId } from "../../../_lib";

/**
 * POST /api/finance/credit-lines/[id]/movements — { type, amount, date?, notes? }
 *
 * Todo en una sola transacción: leer el cupo/saldo actual, validar el
 * retiro contra el disponible, y crear el movimiento. Antes la validación
 * de existencia (`assertCreditLineExists`) y el `create` eran dos
 * sentencias sueltas — si la línea se borraba justo en medio (otra pestaña,
 * otro dispositivo), el `create` violaba la FK y explotaba con un 500 crudo
 * en vez de un 404 legible. Ahora, si la fila desaparece a mitad de
 * transacción, la falla ocurre dentro del mismo bloque controlado.
 */
export const POST = withAuth<{ id: string }>(async ({ req, params }) => {
  const creditLineId = parseId(params.id);
  const data = creditMovementSchema.parse(await req.json());

  const movement = await prisma.$transaction(async (tx) => {
    const line = await tx.financeCreditLine.findUnique({
      where: { id: creditLineId },
      include: { movements: { select: { type: true, amount: true } } },
    });
    if (!line) throw notFound("La línea de crédito indicada no existe");

    // Sin esto, un retiro podía superar el cupo sin ningún aviso: la API lo
    // aceptaba, y `creditLineBalance` simplemente recortaba `available` a 0
    // en vez de reflejar el sobregiro — la UI mostraba "usado $2.000.000 /
    // cupo $500.000", un estado inconsistente sin que nada lo hubiera
    // marcado como error.
    if (data.type === "withdrawal" && line.creditLimit !== null) {
      const { available } = creditLineBalance(line.movements, line.creditLimit);
      if (data.amount > (available ?? 0)) {
        throw badRequest(
          `El retiro excede el disponible (${available ?? 0})`,
          { available }
        );
      }
    }

    return tx.financeCreditMovement.create({
      data: {
        creditLineId,
        type: data.type,
        amount: data.amount,
        date: data.date ? parseDateKey(data.date) : undefined,
        notes: data.notes || null,
      },
    });
  });

  return created(movement);
});
