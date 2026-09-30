import { z } from "zod";
import { withAuth } from "@/lib/auth";
import { created, ok } from "@/lib/http";
import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import {
  amountSchema,
  assertSourceExists,
  dateKeySchema,
  money,
  parseDateKey,
  queryObject,
  toDateKey,
} from "../_lib";

const filtersSchema = z.object({
  direction: z.enum(["i_owe", "they_owe_me"]).optional(),
  isSettled: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
});

const createSchema = z.object({
  direction: z.enum(["i_owe", "they_owe_me"]),
  person: z.string().trim().min(1, "Indica la persona").max(120),
  reason: z.string().trim().min(1, "Indica el motivo").max(240),
  amount: amountSchema,
  sourceId: z.number().int().positive(),
  date: dateKeySchema.optional(),
});

/** GET /api/finance/debts ?direction=&isSettled= */
export const GET = withAuth(async ({ searchParams }) => {
  const filters = filtersSchema.parse(queryObject(searchParams));

  const where: Prisma.FinanceDebtWhereInput = {};
  if (filters.direction) where.direction = filters.direction;
  if (filters.isSettled !== undefined) where.isSettled = filters.isSettled;

  const debts = await prisma.financeDebt.findMany({
    where,
    include: { source: true, _count: { select: { payments: true } } },
    orderBy: [{ isSettled: "asc" }, { date: "desc" }, { id: "desc" }],
  });

  return ok(debts);
});

/**
 * POST /api/finance/debts
 * La deuda no mueve el balance de la fuente: el dinero se mueve al registrar
 * el pago o mediante una transacción aparte.
 */
export const POST = withAuth(async ({ req }) => {
  const data = createSchema.parse(await req.json());
  await assertSourceExists(data.sourceId);

  const debt = await prisma.financeDebt.create({
    data: {
      direction: data.direction,
      person: data.person,
      reason: data.reason,
      amount: money(data.amount),
      sourceId: data.sourceId,
      date: parseDateKey(data.date ?? toDateKey()),
    },
    include: { source: true, _count: { select: { payments: true } } },
  });

  return created(debt);
});
