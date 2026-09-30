// @vitest-environment node
import { describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import { GET } from "@/app/api/finance/summary/monthly/route";
import { prismaMock } from "../../mocks/prisma";
import { get } from "../../helpers/route";
import { signOut } from "../../mocks/session";

describe("GET /api/finance/summary/monthly", () => {
  it("calcula totales y desglose por categoría, ordenado de mayor a menor", async () => {
    prismaMock.financeTransaction.findMany.mockResolvedValue([
      { type: "income", amount: new Prisma.Decimal("1000"), category: "otro" },
      { type: "expense", amount: new Prisma.Decimal("300"), category: "alimentación" },
      { type: "expense", amount: new Prisma.Decimal("100"), category: "alimentación" },
      { type: "expense", amount: new Prisma.Decimal("100"), category: "transporte" },
    ]);

    const { status, body } = await get(GET, "/api/finance/summary/monthly?month=2026-03");

    expect(status).toBe(200);
    expect(body.income).toBe(1000);
    expect(body.expense).toBe(500);
    expect(body.net).toBe(500);
    expect(body.transactionCount).toBe(4);
    expect(body.byCategory).toEqual([
      { category: "alimentación", total: 400, count: 2, percentage: 80 },
      { category: "transporte", total: 100, count: 1, percentage: 20 },
    ]);
  });

  it("un mes sin movimientos devuelve ceros y desglose vacío, sin dividir por cero", async () => {
    prismaMock.financeTransaction.findMany.mockResolvedValue([]);

    const { status, body } = await get(GET, "/api/finance/summary/monthly?month=2026-04");

    expect(status).toBe(200);
    expect(body).toMatchObject({
      income: 0,
      expense: 0,
      net: 0,
      transactionCount: 0,
      byCategory: [],
    });
  });

  it("usa el mes actual si no se especifica `month`", async () => {
    prismaMock.financeTransaction.findMany.mockResolvedValue([]);
    const { status, body } = await get(GET, "/api/finance/summary/monthly");
    expect(status).toBe(200);
    expect(typeof body.month).toBe("string");
  });

  it("responde 400 con un mes mal formado", async () => {
    const { status } = await get(GET, "/api/finance/summary/monthly?month=2026-3");
    expect(status).toBe(400);
  });

  it("responde 401 sin sesión", async () => {
    signOut();
    const { status } = await get(GET, "/api/finance/summary/monthly");
    expect(status).toBe(401);
  });
});
