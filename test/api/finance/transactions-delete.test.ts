// @vitest-environment node
import { describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import { DELETE } from "@/app/api/finance/transactions/[id]/route";
import { prismaMock } from "../../mocks/prisma";
import { del } from "../../helpers/route";
import { signOut } from "../../mocks/session";

describe("DELETE /api/finance/transactions/[id]", () => {
  it("revierte un gasto: borrarlo devuelve el dinero a la fuente", async () => {
    prismaMock.financeTransaction.findUnique.mockResolvedValue({
      id: 1,
      type: "expense",
      amount: new Prisma.Decimal("30"),
      sourceId: 1,
    });
    prismaMock.financeTransaction.delete.mockResolvedValue({});
    prismaMock.financeSource.update.mockResolvedValue({});

    const { status, body }: { status: number; body: any } = await del(DELETE, "/api/finance/transactions/1", { id: "1" });

    expect(status).toBe(200);
    expect(body).toEqual({ success: true });
    expect(prismaMock.financeTransaction.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(prismaMock.financeSource.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { balance: { increment: 30 } },
    });
  });

  it("revierte un ingreso: borrarlo resta el dinero de la fuente", async () => {
    prismaMock.financeTransaction.findUnique.mockResolvedValue({
      id: 2,
      type: "income",
      amount: new Prisma.Decimal("100"),
      sourceId: 1,
    });

    const { status } = await del(DELETE, "/api/finance/transactions/2", { id: "2" });

    expect(status).toBe(200);
    expect(prismaMock.financeSource.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { balance: { increment: -100 } },
    });
  });

  it("responde 404 si la transacción no existe (y no toca el balance)", async () => {
    prismaMock.financeTransaction.findUnique.mockResolvedValue(null);

    const { status } = await del(DELETE, "/api/finance/transactions/999", { id: "999" });

    expect(status).toBe(404);
    expect(prismaMock.financeSource.update).not.toHaveBeenCalled();
  });

  it("responde 400 con un id no numérico", async () => {
    const { status } = await del(DELETE, "/api/finance/transactions/abc", { id: "abc" });
    expect(status).toBe(400);
  });

  it("responde 400 con un id no entero (0 o negativo)", async () => {
    const { status } = await del(DELETE, "/api/finance/transactions/0", { id: "0" });
    expect(status).toBe(400);
  });

  it("responde 401 sin sesión", async () => {
    signOut();
    const { status } = await del(DELETE, "/api/finance/transactions/1", { id: "1" });
    expect(status).toBe(401);
  });
});
