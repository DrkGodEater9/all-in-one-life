// @vitest-environment node
import { describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import { POST } from "@/app/api/finance/debts/[id]/pay/route";
import { prismaMock } from "../../mocks/prisma";
import { post } from "../../helpers/route";
import { signOut } from "../../mocks/session";

function debt(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    amount: new Prisma.Decimal("100"),
    amountPaid: new Prisma.Decimal("40"),
    isSettled: false,
    sourceId: 1,
    ...overrides,
  };
}

describe("POST /api/finance/debts/[id]/pay", () => {
  it("crea el pago e incrementa amountPaid sin saldar si queda pendiente", async () => {
    prismaMock.financeDebt.findUnique.mockResolvedValue(debt());
    prismaMock.financeDebtPayment.create.mockResolvedValue({ id: 5, debtId: 1, amount: new Prisma.Decimal("20") });
    prismaMock.financeDebt.update.mockResolvedValue(
      debt({ amountPaid: new Prisma.Decimal("60") })
    );

    const { status, body }: { status: number; body: any } = await post(
      POST,
      "/api/finance/debts/1/pay",
      { amount: 20 },
      { id: "1" }
    );

    expect(status).toBe(201);
    expect(prismaMock.financeDebtPayment.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ debtId: 1, amount: 20 }) })
    );
    expect(prismaMock.financeDebt.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { amountPaid: 60, isSettled: false } })
    );
    expect(body.debt.isSettled).toBe(false);
  });

  it("marca isSettled cuando el pago cubre exactamente el pendiente", async () => {
    prismaMock.financeDebt.findUnique.mockResolvedValue(debt());
    prismaMock.financeDebtPayment.create.mockResolvedValue({ id: 6 });
    prismaMock.financeDebt.update.mockResolvedValue(
      debt({ amountPaid: new Prisma.Decimal("100"), isSettled: true })
    );

    const { status } = await post(
      POST,
      "/api/finance/debts/1/pay",
      { amount: 60 },
      { id: "1" }
    );

    expect(status).toBe(201);
    expect(prismaMock.financeDebt.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { amountPaid: 100, isSettled: true } })
    );
  });

  it("rechaza con 400 un pago que excede el saldo pendiente", async () => {
    prismaMock.financeDebt.findUnique.mockResolvedValue(debt());

    const { status, body }: { status: number; body: any } = await post(
      POST,
      "/api/finance/debts/1/pay",
      { amount: 61 },
      { id: "1" }
    );

    expect(status).toBe(400);
    expect(body.details).toEqual({ pending: 60 });
    expect(prismaMock.financeDebtPayment.create).not.toHaveBeenCalled();
    expect(prismaMock.financeDebt.update).not.toHaveBeenCalled();
  });

  it("rechaza con 400 un pago sobre una deuda ya saldada", async () => {
    prismaMock.financeDebt.findUnique.mockResolvedValue(debt({ isSettled: true }));

    const { status } = await post(
      POST,
      "/api/finance/debts/1/pay",
      { amount: 1 },
      { id: "1" }
    );

    expect(status).toBe(400);
    expect(prismaMock.financeDebtPayment.create).not.toHaveBeenCalled();
  });

  it("responde 404 si la deuda no existe", async () => {
    prismaMock.financeDebt.findUnique.mockResolvedValue(null);

    const { status } = await post(
      POST,
      "/api/finance/debts/999/pay",
      { amount: 1 },
      { id: "999" }
    );

    expect(status).toBe(404);
  });

  it("responde 400 con un monto negativo o cero", async () => {
    prismaMock.financeDebt.findUnique.mockResolvedValue(debt());
    const { status } = await post(
      POST,
      "/api/finance/debts/1/pay",
      { amount: 0 },
      { id: "1" }
    );
    expect(status).toBe(400);
  });

  it("responde 401 sin sesión", async () => {
    signOut();
    const { status } = await post(
      POST,
      "/api/finance/debts/1/pay",
      { amount: 1 },
      { id: "1" }
    );
    expect(status).toBe(401);
  });
});
