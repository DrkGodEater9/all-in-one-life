import { withAuth } from "@/lib/auth";
import { ok, notFound } from "@/lib/http";
import { prisma } from "@/lib/db";
import { assertCreditLineExists, creditLineBalance, creditLineSchema, parseId } from "../../_lib";

/** GET /api/finance/credit-lines/[id] — detalle con movimientos e historial. */
export const GET = withAuth<{ id: string }>(async ({ params }) => {
  const id = parseId(params.id);

  // Una sola query (antes: assertCreditLineExists + findUniqueOrThrow leían
  // la misma fila dos veces).
  const line = await prisma.financeCreditLine.findUnique({
    where: { id },
    include: { movements: { orderBy: [{ date: "desc" }, { id: "desc" }] } },
  });
  if (!line) throw notFound("La línea de crédito indicada no existe");

  const { movements, ...rest } = line;
  return ok({ ...rest, ...creditLineBalance(movements, line.creditLimit), movements });
});

/** PUT /api/finance/credit-lines/[id] — { name, creditLimit? } */
export const PUT = withAuth<{ id: string }>(async ({ req, params }) => {
  const id = parseId(params.id);
  const data = creditLineSchema.parse(await req.json());

  // `data.creditLimit` es `number | null | undefined` tal cual lo necesita
  // Prisma: `undefined` dispara la semántica de PATCH-ual (que
  // `creditLineSchema` promete con `.optional()`) y Prisma OMITE el campo
  // del UPDATE — no lo toca. Antes había un `?? null` aquí que convertía
  // "no mandaste creditLimit" en "bórralo": un cliente que edite solo el
  // nombre (`PUT {name: "X"}`) borraba el cupo que ya tenía configurado.
  const line = await prisma.financeCreditLine.update({
    where: { id },
    data: { name: data.name, creditLimit: data.creditLimit },
    include: { movements: { select: { type: true, amount: true } } },
  });

  // El GET y el POST de creación devuelven used/limit/available calculados;
  // el PUT no lo hacía, así que un futuro "editar línea de crédito" que
  // confiara en la respuesta del PUT (en vez de recargar desde el GET)
  // habría recibido `undefined` en esos tres campos.
  const { movements, ...rest } = line;
  return ok({ ...rest, ...creditLineBalance(movements, line.creditLimit) });
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
