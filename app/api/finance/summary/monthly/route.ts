import { z } from "zod";
import { withAuth } from "@/lib/auth";
import { ok } from "@/lib/http";
import { prisma } from "@/lib/db";
import {
  currentMonthKey,
  money,
  monthKeySchema,
  monthRange,
  num,
  queryObject,
  toDateKeyUTC,
} from "../../_lib";

const querySchema = z.object({
  month: monthKeySchema.optional(),
  sourceId: z.coerce.number().int().positive().optional(),
});

/**
 * GET /api/finance/summary/monthly ?month=YYYY-MM&sourceId= (ambos opcionales)
 *
 * Devuelve totales de ingresos, gastos, neto y el desglose de gastos por
 * categoría — es lo que alimenta la gráfica de dona. `sourceId` limita el
 * resumen a una sola billetera (Diario/Ahorros); sin él, es el combinado.
 */
export const GET = withAuth(async ({ searchParams }) => {
  const { month = currentMonthKey(), sourceId } = querySchema.parse(
    queryObject(searchParams)
  );
  const { start, end } = monthRange(month);

  const transactions = await prisma.financeTransaction.findMany({
    where: { date: { gte: start, lt: end }, ...(sourceId ? { sourceId } : {}) },
    select: { type: true, amount: true, category: true },
  });

  let income = 0;
  let expense = 0;
  const byCategoryMap = new Map<string, { total: number; count: number }>();

  for (const t of transactions) {
    const amount = num(t.amount);
    if (t.type === "income") {
      income += amount;
      continue;
    }
    expense += amount;
    const entry = byCategoryMap.get(t.category) ?? { total: 0, count: 0 };
    entry.total += amount;
    entry.count += 1;
    byCategoryMap.set(t.category, entry);
  }

  const byCategory = Array.from(byCategoryMap.entries())
    .map(([category, { total, count }]) => ({
      category,
      total: money(total),
      count,
      percentage: expense > 0 ? Math.round((total / expense) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.total - a.total);

  return ok({
    month,
    from: toDateKeyUTC(start),
    to: toDateKeyUTC(new Date(end.getTime() - 86_400_000)),
    income: money(income),
    expense: money(expense),
    net: money(income - expense),
    transactionCount: transactions.length,
    byCategory,
  });
});
