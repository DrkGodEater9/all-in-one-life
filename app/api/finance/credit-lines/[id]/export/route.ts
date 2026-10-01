import { withAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { creditLineBalance, num, parseId, toDateKey } from "../../../_lib";
import { notFound } from "@/lib/http";
import { xlsxResponse } from "../../../_xlsx";

/** GET /api/finance/credit-lines/[id]/export — Excel con formato de la línea. */
export const GET = withAuth<{ id: string }>(async ({ params }) => {
  const id = parseId(params.id);
  const line = await prisma.financeCreditLine.findUnique({
    where: { id },
    include: { movements: { orderBy: [{ date: "desc" }, { id: "desc" }] } },
  });
  if (!line) throw notFound("La línea de crédito indicada no existe");

  const balance = creditLineBalance(line.movements, line.creditLimit, line.totalDebt);

  const summary = [
    ...(balance.owed !== null
      ? [{ label: "Debes", value: balance.owed, kind: "money" as const, tone: "negative" as const }]
      : []),
    { label: "Usado", value: balance.used, kind: "money" as const },
    ...(balance.limit !== null
      ? [
          { label: "Cupo total", value: balance.limit, kind: "money" as const },
          { label: "Disponible", value: balance.available ?? 0, kind: "money" as const },
        ]
      : []),
  ];

  const rows = line.movements.map((m) => {
    const amount = num(m.amount);
    return {
      date: m.date,
      type: m.type === "withdrawal" ? "Retiro" : "Pago",
      // Retiros suman deuda (negativo para ti), pagos la reducen.
      amount: m.type === "withdrawal" ? amount : -amount,
      notes: m.notes ?? "",
    };
  });

  const safeName = line.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  return xlsxResponse(
    {
      sheetName: line.name.replace(/[\/?*[\]:]/g, " ").slice(0, 31) || "Crédito",
      title: `Crédito · ${line.name}`,
      subtitle: `Generado el ${toDateKey()} · ${rows.length} movimientos`,
      summary,
      columns: [
        { header: "Fecha", key: "date", width: 13, kind: "date" },
        { header: "Tipo", key: "type", width: 11, align: "center" },
        { header: "Monto", key: "amount", width: 18, kind: "money" },
        { header: "Notas", key: "notes", width: 42 },
      ],
      rows,
      // Retiro = sube la deuda (rojo); pago = baja la deuda (verde).
      rowTone: (r) => ((r.amount as number) >= 0 ? "negative" : "positive"),
      emptyMessage: "Todavía no hay movimientos.",
    },
    `credito-${safeName}-${toDateKey()}.xlsx`
  );
});
