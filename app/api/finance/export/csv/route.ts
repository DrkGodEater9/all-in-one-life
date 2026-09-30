import { withAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  num,
  queryObject,
  toDateKey,
  toDateKeyUTC,
  transactionFiltersSchema,
  transactionWhere,
} from "../../_lib";

const HEADERS = ["fecha", "tipo", "categoria", "fuente", "monto", "notas"];

/** Escapa un campo para CSV (RFC 4180). */
function csvCell(value: unknown): string {
  const raw = value === null || value === undefined ? "" : String(value);
  return /[",\r\n]/.test(raw) ? `"${raw.replace(/"/g, '""')}"` : raw;
}

/**
 * GET /api/finance/export/csv ?type=&category=&sourceId=&from=&to=
 * Mismos filtros que el listado. Devuelve un CSV descargable.
 */
export const GET = withAuth(async ({ searchParams }) => {
  const filters = transactionFiltersSchema.parse(queryObject(searchParams));

  const transactions = await prisma.financeTransaction.findMany({
    where: transactionWhere(filters),
    include: { source: true },
    orderBy: [{ date: "desc" }, { id: "desc" }],
  });

  const rows = transactions.map((t) =>
    [
      toDateKeyUTC(t.date),
      t.type === "income" ? "ingreso" : "gasto",
      t.category,
      t.source.name,
      num(t.amount).toFixed(2),
      t.notes ?? "",
    ]
      .map(csvCell)
      .join(",")
  );

  // BOM para que Excel abra bien los acentos.
  const csv = `﻿${[HEADERS.join(","), ...rows].join("\r\n")}\r\n`;
  const filename = `transacciones-${toDateKey()}.csv`;

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
});
