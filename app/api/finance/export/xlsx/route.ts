import { withAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { SOURCE_LABELS, type SourceName } from "@/components/modules/finance/constants";
import {
  money,
  num,
  queryObject,
  toDateKey,
  transactionFiltersSchema,
  transactionWhere,
} from "../../_lib";
import { xlsxResponse } from "../../_xlsx";

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * GET /api/finance/export/xlsx ?type=&category=&sourceId=&from=&to=
 * Mismos filtros que el listado. Devuelve un Excel con formato.
 */
export const GET = withAuth(async ({ searchParams }) => {
  const filters = transactionFiltersSchema.parse(queryObject(searchParams));

  const transactions = await prisma.financeTransaction.findMany({
    where: transactionWhere(filters),
    include: { source: true },
    orderBy: [{ date: "desc" }, { id: "desc" }],
  });

  let income = 0;
  let expense = 0;
  const rows = transactions.map((t) => {
    const amount = num(t.amount);
    if (t.type === "income") income += amount;
    else expense += amount;
    return {
      date: t.date,
      type: t.type === "income" ? "Ingreso" : "Gasto",
      category: cap(t.category),
      source: SOURCE_LABELS[t.source.name as SourceName] ?? t.source.name,
      amount: t.type === "income" ? amount : -amount,
      notes: t.notes ?? "",
    };
  });

  const net = money(income - expense);
  const range =
    filters.from || filters.to ? `Periodo: ${filters.from ?? "inicio"} → ${filters.to ?? "hoy"} · ` : "";

  return xlsxResponse(
    {
      sheetName: "Transacciones",
      title: "Transacciones",
      subtitle: `${range}Generado el ${toDateKey()} · ${rows.length} registros`,
      summary: [
        { label: "Ingresos", value: money(income), kind: "money", tone: "positive" },
        { label: "Gastos", value: money(expense), kind: "money", tone: "negative" },
        { label: "Neto", value: net, kind: "money", tone: net >= 0 ? "positive" : "negative" },
      ],
      columns: [
        { header: "Fecha", key: "date", width: 13, kind: "date" },
        { header: "Tipo", key: "type", width: 11, align: "center" },
        { header: "Categoría", key: "category", width: 20 },
        { header: "Fuente", key: "source", width: 13 },
        { header: "Monto", key: "amount", width: 18, kind: "money" },
        { header: "Notas", key: "notes", width: 42 },
      ],
      rows,
      rowTone: (r) => ((r.amount as number) >= 0 ? "positive" : "negative"),
      totals: { label: "Neto", keys: ["amount"] },
      emptyMessage: "No hay transacciones con estos filtros.",
    },
    `transacciones-${toDateKey()}.xlsx`
  );
});
