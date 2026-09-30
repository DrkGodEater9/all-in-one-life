// @vitest-environment node
import { describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import { GET } from "@/app/api/finance/balance/route";
import { prismaMock } from "../../mocks/prisma";
import { get } from "../../helpers/route";
import { signOut } from "../../mocks/session";

describe("GET /api/finance/balance", () => {
  it("devuelve números planos, no Decimal ni strings", async () => {
    prismaMock.financeSource.findMany.mockResolvedValue([
      { id: 1, name: "daily", balance: new Prisma.Decimal("1234.56") },
      { id: 2, name: "savings", balance: new Prisma.Decimal("300.25") },
    ]);

    const { status, body } = await get(GET, "/api/finance/balance");

    expect(status).toBe(200);
    expect(typeof body.daily).toBe("number");
    expect(typeof body.savings).toBe("number");
    expect(typeof body.total).toBe("number");
    expect(body.daily).toBe(1234.56);
    expect(body.savings).toBe(300.25);
    expect(body.total).toBe(1534.81);
    expect(body.sources).toEqual([
      { id: 1, name: "daily", balance: 1234.56 },
      { id: 2, name: "savings", balance: 300.25 },
    ]);
  });

  it("crea las fuentes por defecto en 0 si no existen todavía (idempotente)", async () => {
    prismaMock.financeSource.findMany.mockResolvedValue([]);
    prismaMock.financeSource.create
      .mockResolvedValueOnce({ id: 1, name: "daily", balance: new Prisma.Decimal("0") })
      .mockResolvedValueOnce({ id: 2, name: "savings", balance: new Prisma.Decimal("0") });

    const { status, body } = await get(GET, "/api/finance/balance");

    expect(status).toBe(200);
    expect(body.daily).toBe(0);
    expect(body.savings).toBe(0);
    expect(body.total).toBe(0);
  });

  it("responde 401 sin sesión", async () => {
    signOut();
    const { status } = await get(GET, "/api/finance/balance");
    expect(status).toBe(401);
  });
});
