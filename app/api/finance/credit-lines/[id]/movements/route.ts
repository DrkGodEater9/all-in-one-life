import { withAuth } from "@/lib/auth";
import { created } from "@/lib/http";
import { prisma } from "@/lib/db";
import { assertCreditLineExists, creditMovementSchema, parseDateKey, parseId } from "../../../_lib";

/** POST /api/finance/credit-lines/[id]/movements — { type, amount, date?, notes? } */
export const POST = withAuth<{ id: string }>(async ({ req, params }) => {
  const creditLineId = parseId(params.id);
  await assertCreditLineExists(creditLineId);
  const data = creditMovementSchema.parse(await req.json());

  const movement = await prisma.financeCreditMovement.create({
    data: {
      creditLineId,
      type: data.type,
      amount: data.amount,
      date: data.date ? parseDateKey(data.date) : undefined,
      notes: data.notes || null,
    },
  });

  return created(movement);
});
