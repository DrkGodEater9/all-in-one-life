import { z } from "zod";
import { withAuth } from "@/lib/auth";
import { created, ok } from "@/lib/http";
import { prisma } from "@/lib/db";
import {
  amountSchema,
  assertSourceExists,
  balanceDelta,
  categorySchema,
  dateKeySchema,
  money,
  parseDateKey,
  queryObject,
  toDateKey,
  transactionFiltersSchema,
  transactionWhere,
} from "../_lib";

const createSchema = z.object({
  type: z.enum(["expense", "income"]),
  amount: amountSchema,
  category: categorySchema,
  sourceId: z.number().int().positive(),
  date: dateKeySchema.optional(),
  notes: z.string().trim().max(500).optional().nullable(),
});

/** GET /api/finance/transactions ?type=&category=&sourceId=&from=&to= */
export const GET = withAuth(async ({ searchParams }) => {
  const filters = transactionFiltersSchema.parse(queryObject(searchParams));

  const transactions = await prisma.financeTransaction.findMany({
    where: transactionWhere(filters),
    include: { source: true },
    orderBy: [{ date: "desc" }, { id: "desc" }],
  });

  return ok(transactions);
});

/**
 * POST /api/finance/transactions
 * Crea la transacción y ajusta el balance de su fuente de forma atómica:
 * `income` suma, `expense` resta.
 */
export const POST = withAuth(async ({ req }) => {
  const data = createSchema.parse(await req.json());
  await assertSourceExists(data.sourceId);

  const amount = money(data.amount);
  const delta = balanceDelta(data.type, amount);

  const [transaction] = await prisma.$transaction([
    prisma.financeTransaction.create({
      data: {
        type: data.type,
        amount,
        category: data.category,
        sourceId: data.sourceId,
        date: parseDateKey(data.date ?? toDateKey()),
        notes: data.notes?.trim() ? data.notes.trim() : null,
      },
      include: { source: true },
    }),
    prisma.financeSource.update({
      where: { id: data.sourceId },
      data: { balance: { increment: delta } },
    }),
  ]);

  return created(transaction);
});
