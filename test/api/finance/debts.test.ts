// @vitest-environment node
import { describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import { GET, POST } from "@/app/api/finance/debts/route";
import { prismaMock } from "../../mocks/prisma";
import { get, post } from "../../helpers/route";
import { signOut } from "../../mocks/session";

const DAILY = { id: 1, name: "daily", balance: new Prisma.Decimal("0") };
const SAVINGS = { id: 2, name: "savings", balance: new Prisma.Decimal("0") };

describe("GET /api/finance/debts", () => {
  it("traduce direction e isSettled al where correcto", async () => {
    prismaMock.financeDebt.findMany.mockResolvedValue([]);

    await get(GET, "/api/finance/debts?direction=i_owe&isSettled=false");

    expect(prismaMock.financeDebt.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { direction: "i_owe", isSettled: false } })
    );
  });

  it("sin filtros deja el where vacío", async () => {
    prismaMock.financeDebt.findMany.mockResolvedValue([]);
    await get(GET, "/api/finance/debts");
    expect(prismaMock.financeDebt.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: {} })
    );
  });

  it("responde 401 sin sesión", async () => {
    signOut();
    const { status } = await get(GET, "/api/finance/debts");
    expect(status).toBe(401);
  });
});

describe("POST /api/finance/debts", () => {
  it("crea la deuda sin tocar el balance de ninguna fuente", async () => {
    prismaMock.financeSource.findMany.mockResolvedValue([DAILY, SAVINGS]);
    prismaMock.financeSource.findUnique.mockResolvedValue(DAILY);
    prismaMock.financeDebt.create.mockResolvedValue({ id: 1 });

    const { status } = await post(POST, "/api/finance/debts", {
      direction: "i_owe",
      person: "Ana",
      reason: "préstamo",
      amount: 100,
      sourceId: 1,
    });

    expect(status).toBe(201);
    expect(prismaMock.financeSource.update).not.toHaveBeenCalled();
  });

  it("responde 400 con un monto menor o igual a cero", async () => {
    prismaMock.financeSource.findMany.mockResolvedValue([DAILY, SAVINGS]);
    prismaMock.financeSource.findUnique.mockResolvedValue(DAILY);

    const { status } = await post(POST, "/api/finance/debts", {
      direction: "i_owe",
      person: "Ana",
      reason: "x",
      amount: 0,
      sourceId: 1,
    });

    expect(status).toBe(400);
  });

  it("responde 400 si falta la persona o el motivo", async () => {
    const { status } = await post(POST, "/api/finance/debts", {
      direction: "i_owe",
      person: "",
      reason: "",
      amount: 10,
      sourceId: 1,
    });
    expect(status).toBe(400);
  });

  it("responde 401 sin sesión", async () => {
    signOut();
    const { status } = await post(POST, "/api/finance/debts", {
      direction: "i_owe",
      person: "Ana",
      reason: "x",
      amount: 10,
      sourceId: 1,
    });
    expect(status).toBe(401);
  });
});
