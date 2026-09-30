import { withAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  csvResponse,
  num,
  queryObject,
  toDateKey,
  toDateKeyUTC,
  transactionFiltersSchema,
  transactionWhere,
} from "../../_lib";

const HEADERS = ["fecha", "tipo", "categoria", "fuente", "monto", "notas"];

/**
 * GET /api/finance/export/csv ?type=&category=&sourceId=&from=&to=
 * Mismos filtros que el listado. Devuelve un CSV descargable.
 *
 * Usa `csvResponse`/`csvCell` de `_lib` (los mismos que el export de líneas
 * de crédito) en vez de reimplementar el escapado RFC 4180 y el BOM aquí:
 * eran dos copias idénticas que podían divergir.
 */
export const GET = withAuth(async ({ searchParams }) => {
  const filters = transactionFiltersSchema.parse(queryObject(searchParams));

  const transactions = await prisma.financeTransaction.findMany({
    where: transactionWhere(filters),
    include: { source: true },
    orderBy: [{ date: "desc" }, { id: "desc" }],
  });

  const rows = transactions.map((t) => [
    toDateKeyUTC(t.date),
    t.type === "income" ? "ingreso" : "gasto",
    t.category,
    t.source.name,
    num(t.amount).toFixed(2),
    t.notes ?? "",
  ]);

  return csvResponse(HEADERS, rows, `transacciones-${toDateKey()}.csv`);
});
