// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  cn,
  formatNumber,
  toDateKey,
  parseDateKey,
  dbDateKey,
  parseTime,
  formatTime,
  toNumber,
} from "@/lib/utils";
import { Prisma } from "@prisma/client";

describe("cn", () => {
  it("resuelve conflictos de Tailwind quedándose con la última clase", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });

  it("ignora valores falsy", () => {
    expect(cn("a", false && "b", undefined, null, "c")).toBe("a c");
  });
});

describe("fechas", () => {
  it("toDateKey usa el día local", () => {
    const d = new Date(2026, 2, 15, 23, 30); // 15 de marzo, hora local
    expect(toDateKey(d)).toBe("2026-03-15");
  });

  it("parseDateKey produce medianoche UTC, que es lo que espera @db.Date", () => {
    expect(parseDateKey("2026-03-15").toISOString()).toBe("2026-03-15T00:00:00.000Z");
  });

  it("dbDateKey lee de vuelta el mismo día", () => {
    expect(dbDateKey(parseDateKey("2026-03-15"))).toBe("2026-03-15");
  });

  it("dbDateKey no pierde un día en husos negativos, a diferencia de toDateKey", () => {
    // Lo que Prisma devuelve para una columna @db.Date.
    const fromDb = new Date("2026-03-15T00:00:00.000Z");
    expect(dbDateKey(fromDb)).toBe("2026-03-15");

    // En un huso negativo (p. ej. Bogotá, UTC-5) esa misma fecha leída en local
    // sería el día anterior. Este es justamente el error que dbDateKey evita.
    if (fromDb.getTimezoneOffset() > 0) {
      expect(toDateKey(fromDb)).toBe("2026-03-14");
    }
  });

  it("dbDateKey acepta también un string ISO", () => {
    expect(dbDateKey("2026-12-31T00:00:00.000Z")).toBe("2026-12-31");
  });
});

describe("horas", () => {
  it("parseTime produce un Date UTC sobre la época", () => {
    expect(parseTime("07:30").toISOString()).toBe("1970-01-01T07:30:00.000Z");
  });

  it("formatTime devuelve HH:mm", () => {
    expect(formatTime(parseTime("09:05"))).toBe("09:05");
  });

  it("formatTime tolera null y undefined", () => {
    expect(formatTime(null)).toBe("");
    expect(formatTime(undefined)).toBe("");
  });

  it("ida y vuelta para medianoche", () => {
    expect(formatTime(parseTime("00:00"))).toBe("00:00");
  });
});

describe("toNumber", () => {
  it("convierte un Decimal de Prisma", () => {
    expect(toNumber(new Prisma.Decimal("1234.56"))).toBe(1234.56);
  });

  it("devuelve 0 para null y undefined", () => {
    expect(toNumber(null)).toBe(0);
    expect(toNumber(undefined)).toBe(0);
  });
});

describe("formatNumber", () => {
  it("respeta los decimales pedidos", () => {
    expect(formatNumber(1234.5678, 2)).toContain("1.234,57");
  });

  it("devuelve 0 ante un valor no numérico", () => {
    expect(formatNumber(Number.NaN)).toBe("0");
  });
});
