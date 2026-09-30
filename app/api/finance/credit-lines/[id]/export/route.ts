import { withAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { assertCreditLineExists, csvResponse, num, parseId, toDateKey, toDateKeyUTC } from "../../../_lib";

const HEADERS = ["fecha", "tipo", "monto", "notas"];

/** GET /api/finance/credit-lines/[id]/export — CSV descargable de la línea. */
export const GET = withAuth<{ id: string }>(async ({ params }) => {
  const id = parseId(params.id);
  const line = await assertCreditLineExists(id);

  const movements = await prisma.financeCreditMovement.findMany({
    where: { creditLineId: id },
    orderBy: [{ date: "desc" }, { id: "desc" }],
  });

  const rows = movements.map((m) => [
    toDateKeyUTC(m.date),
    m.type === "withdrawal" ? "retiro" : "pago",
    num(m.amount).toFixed(2),
    m.notes ?? "",
  ]);

  const safeName = line.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  return csvResponse(HEADERS, rows, `credito-${safeName}-${toDateKey()}.csv`);
});
