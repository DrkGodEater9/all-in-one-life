// @vitest-environment node
import { describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import { GET, POST } from "@/app/api/finance/transactions/route";
import { prismaMock } from "../../mocks/prisma";
import { get, post } from "../../helpers/route";
import { signOut } from "../../mocks/session";

const DAILY = { id: 1, name: "daily", balance: new Prisma.Decimal("100") };
const SAVINGS = { id: 2, name: "savings", balance: new Prisma.Decimal("500") };

describe("GET /api/finance/transactions", () => {
  it("devuelve las transacciones serializadas (Decimal -> number)", async () => {
    prismaMock.financeTransaction.findMany.mockResolvedValue([
      { id: 1, amount: new Prisma.Decimal("1500.50"), type: "expense", source: DAILY },
    ]);

    const { status, body }: { status: number; body: any } = await get(GET, "/api/finance/transactions");

    expect(status).toBe(200);
    expect(body[0].amount).toBe(1500.5);
  });

  it("traduce los filtros (type, category, sourceId, from, to) al where correcto", async () => {
    prismaMock.financeTransaction.findMany.mockResolvedValue([]);

    await get(
      GET,
      "/api/finance/transactions?type=expense&category=salud&sourceId=2&from=2026-01-01&to=2026-01-31"
    );

    expect(prismaMock.financeTransaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          type: "expense",
          category: "salud",
          sourceId: 2,
          date: {
            gte: new Date("2026-01-01T00:00:00.000Z"),
            lte: new Date("2026-01-31T00:00:00.000Z"),
          },
        },
      })
    );
  });

  it("con solo `from` construye el where sin `lte`", async () => {
    prismaMock.financeTransaction.findMany.mockResolvedValue([]);

    await get(GET, "/api/finance/transactions?from=2026-02-01");

    expect(prismaMock.financeTransaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { date: { gte: new Date("2026-02-01T00:00:00.000Z") } },
      })
    );
  });

  it("responde 400 con un `type` fuera del enum", async () => {
    const { status } = await get(GET, "/api/finance/transactions?type=nope");
    expect(status).toBe(400);
  });

  it("responde 400 con una fecha mal formada", async () => {
    const { status } = await get(GET, "/api/finance/transactions?from=01-01-2026");
    expect(status).toBe(400);
  });

  it("responde 401 sin sesión", async () => {
    signOut();
    const { status } = await get(GET, "/api/finance/transactions");
    expect(status).toBe(401);
  });
});

describe("POST /api/finance/transactions", () => {
  function mockSources() {
    prismaMock.financeSource.findMany.mockResolvedValue([DAILY, SAVINGS]);
    prismaMock.financeSource.findUnique.mockResolvedValue(DAILY);
  }

  it("crea un gasto y resta del balance de la fuente, dentro de $transaction", async () => {
    mockSources();
    prismaMock.financeTransaction.create.mockResolvedValue({
      id: 10,
      type: "expense",
      amount: new Prisma.Decimal("50"),
      sourceId: 1,
      source: DAILY,
    });
    prismaMock.financeSource.update.mockResolvedValue({});

    const { status, body }: { status: number; body: any } = await post(POST, "/api/finance/transactions", {
      type: "expense",
      amount: 50,
      category: "alimentación",
      sourceId: 1,
    });

    expect(status).toBe(201);
    expect(body.amount).toBe(50);
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    // La forma en array debe llamarse con ambas operaciones ya construidas.
    expect(prismaMock.financeTransaction.create).toHaveBeenCalled();
    expect(prismaMock.financeSource.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { balance: { increment: -50 } },
    });
  });

  it("crea un ingreso y suma al balance de la fuente", async () => {
    mockSources();
    prismaMock.financeTransaction.create.mockResolvedValue({
      id: 11,
      type: "income",
      amount: new Prisma.Decimal("200"),
      sourceId: 1,
      source: DAILY,
    });
    prismaMock.financeSource.update.mockResolvedValue({});

    const { status } = await post(POST, "/api/finance/transactions", {
      type: "income",
      amount: 200,
      category: "otro",
      sourceId: 1,
    });

    expect(status).toBe(201);
    expect(prismaMock.financeSource.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { balance: { increment: 200 } },
    });
  });

  it("responde 400 con una categoría fuera del enum", async () => {
    mockSources();
    const { status } = await post(POST, "/api/finance/transactions", {
      type: "expense",
      amount: 10,
      category: "no-existe",
      sourceId: 1,
    });
    expect(status).toBe(400);
    expect(prismaMock.financeTransaction.create).not.toHaveBeenCalled();
  });

  it("responde 400 con un monto negativo o cero", async () => {
    mockSources();
    for (const amount of [-5, 0]) {
      const { status } = await post(POST, "/api/finance/transactions", {
        type: "expense",
        amount,
        category: "otro",
        sourceId: 1,
      });
      expect(status).toBe(400);
    }
  });

  it("responde 400 si la fuente no existe", async () => {
    prismaMock.financeSource.findMany.mockResolvedValue([DAILY, SAVINGS]);
    prismaMock.financeSource.findUnique.mockResolvedValue(null);

    const { status } = await post(POST, "/api/finance/transactions", {
      type: "expense",
      amount: 10,
      category: "otro",
      sourceId: 999,
    });

    expect(status).toBe(400);
    expect(prismaMock.financeTransaction.create).not.toHaveBeenCalled();
  });

  it("responde 401 sin sesión", async () => {
    signOut();
    const { status } = await post(POST, "/api/finance/transactions", {
      type: "expense",
      amount: 10,
      category: "otro",
      sourceId: 1,
    });
    expect(status).toBe(401);
  });
});
