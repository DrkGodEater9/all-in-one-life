// @vitest-environment node
import { describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import { GET } from "@/app/api/finance/export/csv/route";
import { prismaMock } from "../../mocks/prisma";
import { makeRequest } from "../../helpers/route";
import { signOut } from "../../mocks/session";

describe("GET /api/finance/export/csv", () => {
  it("responde con Content-Type text/csv y Content-Disposition de descarga", async () => {
    prismaMock.financeTransaction.findMany.mockResolvedValue([]);

    const res = await GET(makeRequest("/api/finance/export/csv"));

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/csv");
    expect(res.headers.get("content-disposition")).toContain("attachment");
    expect(res.headers.get("content-disposition")).toContain(".csv");
  });

  it("escapa un campo con comas y comillas según RFC 4180", async () => {
    prismaMock.financeTransaction.findMany.mockResolvedValue([
      {
        date: new Date("2026-01-05T00:00:00.000Z"),
        type: "expense",
        category: "otro",
        amount: new Prisma.Decimal("10"),
        notes: 'Compra, con "descuento"',
        source: { name: "daily" },
      },
    ]);

    const res = await GET(makeRequest("/api/finance/export/csv"));
    const text = await res.text();

    expect(text).toContain('"Compra, con ""descuento"""');
    // La fecha se lee en UTC (columna @db.Date), no en el huso local.
    expect(text).toContain("2026-01-05");
  });

  it("no escapa un campo simple sin comas ni comillas", async () => {
    prismaMock.financeTransaction.findMany.mockResolvedValue([
      {
        date: new Date("2026-01-05T00:00:00.000Z"),
        type: "income",
        category: "otro",
        amount: new Prisma.Decimal("10"),
        notes: null,
        source: { name: "savings" },
      },
    ]);

    const res = await GET(makeRequest("/api/finance/export/csv"));
    const text = await res.text();
    const dataLine = text.split("\r\n")[1];

    expect(dataLine).toBe("2026-01-05,ingreso,otro,savings,10.00,");
  });

  it("responde 401 sin sesión", async () => {
    signOut();
    const res = await GET(makeRequest("/api/finance/export/csv"));
    expect(res.status).toBe(401);
  });
});
