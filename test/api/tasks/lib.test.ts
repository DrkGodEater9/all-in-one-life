// @vitest-environment node
import { describe, expect, it } from "vitest";
import { nextOccurrence, resolveFlags, taskWhere } from "@/app/api/tasks/_lib";

describe("nextOccurrence", () => {
  it("daily: suma intervalN días", () => {
    const from = new Date("2026-03-10T00:00:00.000Z");
    const next = nextOccurrence(from, { frequency: "daily", intervalN: 3, dayOfMonth: null });
    expect(next.toISOString().slice(0, 10)).toBe("2026-03-13");
  });

  it("weekly: suma intervalN semanas", () => {
    const from = new Date("2026-03-10T00:00:00.000Z"); // martes
    const next = nextOccurrence(from, { frequency: "weekly", intervalN: 2, dayOfMonth: null });
    expect(next.toISOString().slice(0, 10)).toBe("2026-03-24");
  });

  it("monthly: mismo día del mes cuando dayOfMonth es null", () => {
    const from = new Date("2026-01-15T00:00:00.000Z");
    const next = nextOccurrence(from, { frequency: "monthly", intervalN: 1, dayOfMonth: null });
    expect(next.toISOString().slice(0, 10)).toBe("2026-02-15");
  });

  it("monthly: usa dayOfMonth cuando la regla lo fija", () => {
    const from = new Date("2026-01-15T00:00:00.000Z");
    const next = nextOccurrence(from, { frequency: "monthly", intervalN: 1, dayOfMonth: 5 });
    expect(next.toISOString().slice(0, 10)).toBe("2026-02-05");
  });

  it("monthly: 31 de enero +1 mes cae en el último día de febrero (año no bisiesto)", () => {
    const from = new Date("2027-01-31T00:00:00.000Z"); // 2027 no es bisiesto
    const next = nextOccurrence(from, { frequency: "monthly", intervalN: 1, dayOfMonth: null });
    expect(next.toISOString().slice(0, 10)).toBe("2027-02-28");
  });

  it("monthly: 31 de enero +1 mes cae en 29 de febrero en año bisiesto", () => {
    const from = new Date("2028-01-31T00:00:00.000Z"); // 2028 es bisiesto
    const next = nextOccurrence(from, { frequency: "monthly", intervalN: 1, dayOfMonth: null });
    expect(next.toISOString().slice(0, 10)).toBe("2028-02-29");
  });

  it("monthly: intervalN mayor que 1 mes", () => {
    const from = new Date("2026-01-31T00:00:00.000Z");
    const next = nextOccurrence(from, { frequency: "monthly", intervalN: 2, dayOfMonth: null });
    // enero + 2 meses = marzo, que sí tiene 31 días
    expect(next.toISOString().slice(0, 10)).toBe("2026-03-31");
  });
});

describe("resolveFlags", () => {
  it("el atajo quadrant manda sobre urgent/important sueltos", () => {
    const flags = resolveFlags(
      { quadrant: "delegate", urgent: false, important: true },
      { urgent: false, important: false }
    );
    expect(flags).toEqual({ urgent: true, important: false });
  });

  it("sin quadrant, usa los booleanos explícitos y cae al fallback si faltan", () => {
    expect(resolveFlags({ urgent: true }, { urgent: false, important: true })).toEqual({
      urgent: true,
      important: true,
    });
    expect(resolveFlags({}, { urgent: true, important: false })).toEqual({
      urgent: true,
      important: false,
    });
  });
});

describe("taskWhere", () => {
  it("coacciona los booleanos de query a valores reales, no a strings truthy", () => {
    const where = taskWhere({ urgent: false, important: true } as never);
    expect(where.urgent).toBe(false);
    expect(where.important).toBe(true);
  });

  it("quadrant fija ambos flags según QUADRANT_FLAGS", () => {
    const where = taskWhere({ quadrant: "eliminate" } as never);
    expect(where.urgent).toBe(false);
    expect(where.important).toBe(false);
  });

  it("label acepta un id numérico", () => {
    const where = taskWhere({ label: "7" } as never);
    expect(where.labels).toEqual({ some: { labelId: 7 } });
  });

  it("label acepta un nombre", () => {
    const where = taskWhere({ label: "urgente" } as never);
    expect(where.labels).toEqual({ some: { label: { name: "urgente" } } });
  });
});
