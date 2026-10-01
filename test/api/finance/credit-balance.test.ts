// @vitest-environment node
import { describe, expect, it } from "vitest";
import { creditLineBalance, creditLineSchema } from "@/app/api/finance/_lib";

const W = (amount: number) => ({ type: "withdrawal", amount });
const P = (amount: number) => ({ type: "payment", amount });

describe("creditLineBalance", () => {
  it("sin totalDebt (líneas viejas): los pagos liberan cupo y owed es null", () => {
    const r = creditLineBalance([W(300), P(100)], 1000);
    expect(r).toEqual({ used: 200, limit: 1000, available: 800, owed: null });
  });

  it("con totalDebt: pagar baja lo que se debe pero no libera cupo", () => {
    const r = creditLineBalance([W(100), P(250)], 1000, 500);
    expect(r.owed).toBe(350); // 500 + 100 - 250
    expect(r.used).toBe(600); // 500 + 100
    expect(r.available).toBe(400);
  });

  it("con totalDebt: owed nunca es negativo si se paga de más", () => {
    expect(creditLineBalance([P(900)], null, 500).owed).toBe(0);
  });

  it("totalDebt 0 también activa el seguimiento", () => {
    expect(creditLineBalance([W(50)], null, 0)).toMatchObject({ owed: 50, available: null });
  });
});

describe("creditLineSchema", () => {
  it("totalDebt es opcional, acepta null y 0, rechaza negativos", () => {
    expect(creditLineSchema.safeParse({ name: "Nu" }).success).toBe(true);
    expect(creditLineSchema.safeParse({ name: "Nu", totalDebt: null }).success).toBe(true);
    expect(creditLineSchema.safeParse({ name: "Nu", totalDebt: 0 }).success).toBe(true);
    expect(creditLineSchema.safeParse({ name: "Nu", totalDebt: -1 }).success).toBe(false);
  });
});
