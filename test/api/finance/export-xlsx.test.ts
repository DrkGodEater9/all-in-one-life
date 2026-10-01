// @vitest-environment node
import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import { Prisma } from "@prisma/client";
import { GET } from "@/app/api/finance/export/xlsx/route";
import { GET as GET_CREDIT } from "@/app/api/finance/credit-lines/[id]/export/route";
import { prismaMock } from "../../mocks/prisma";
import { makeRequest } from "../../helpers/route";
import { signOut } from "../../mocks/session";

async function sheetOf(res: Response) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(Buffer.from(await res.arrayBuffer()) as unknown as ArrayBuffer);
  return wb.worksheets[0];
}

describe("GET /api/finance/export/xlsx", () => {
  it("responde con Content-Type xlsx y Content-Disposition de descarga", async () => {
    prismaMock.financeTransaction.findMany.mockResolvedValue([]);

    const res = await GET(makeRequest("/api/finance/export/xlsx"));

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("spreadsheetml.sheet");
    expect(res.headers.get("content-disposition")).toContain("attachment");
    expect(res.headers.get("content-disposition")).toContain(".xlsx");
  });

  it("genera encabezados, filas con montos con signo y resumen", async () => {
    prismaMock.financeTransaction.findMany.mockResolvedValue([
      {
        date: new Date("2026-01-05T00:00:00.000Z"),
        type: "expense",
        category: "otro",
        amount: new Prisma.Decimal("10"),
        notes: "Compra",
        source: { name: "daily" },
      },
      {
        date: new Date("2026-01-04T00:00:00.000Z"),
        type: "income",
        category: "otro",
        amount: new Prisma.Decimal("50"),
        notes: null,
        source: { name: "savings" },
      },
    ]);

    const ws = await sheetOf(await GET(makeRequest("/api/finance/export/xlsx")));
    const values: unknown[] = [];
    ws.eachRow((row) => values.push(...(row.values as unknown[])));

    expect(ws.getCell("A1").value).toBe("Transacciones");
    expect(values).toContain("Fecha");
    expect(values).toContain("Gasto");
    expect(values).toContain("Ingreso");
    expect(values).toContain("Diario");
    expect(values).toContain(-10);
    expect(values).toContain(50);
    expect(ws.getCell("B6").value).toBe(40); // Neto = 50 - 10
  });

  it("responde 401 sin sesión", async () => {
    signOut();
    const res = await GET(makeRequest("/api/finance/export/xlsx"));
    expect(res.status).toBe(401);
  });
});

describe("GET /api/finance/credit-lines/[id]/export", () => {
  it("exporta un Excel con el resumen de deuda y los movimientos", async () => {
    prismaMock.financeCreditLine.findUnique.mockResolvedValue({
      id: 1,
      name: "Nu",
      creditLimit: new Prisma.Decimal("1000"),
      totalDebt: new Prisma.Decimal("500"),
      createdAt: new Date(),
      movements: [
        {
          id: 1,
          type: "payment",
          amount: new Prisma.Decimal("100"),
          date: new Date("2026-01-05T00:00:00.000Z"),
          notes: "abono",
        },
      ],
    } as never);

    const res = await GET_CREDIT(makeRequest("/api/finance/credit-lines/1/export"), {
      params: { id: "1" },
    });

    expect(res.headers.get("content-disposition")).toContain(".xlsx");
    const ws = await sheetOf(res);
    expect(ws.getCell("A1").value).toBe("Crédito · Nu");
    expect(ws.getCell("A4").value).toBe("Debes");
    expect(ws.getCell("B4").value).toBe(400);
  });
});
