// @vitest-environment node
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { GET } from "@/app/api/nutrition/history/route";
import { prismaMock } from "../../mocks/prisma";
import { get } from "../../helpers/route";
import { signOut } from "../../mocks/session";

describe("GET /api/nutrition/history", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-10T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("devuelve una serie continua de `days` días, con ceros en los días sin registro", async () => {
    prismaMock.nutritionMealLog.findMany.mockResolvedValue([
      {
        date: new Date("2026-01-08T00:00:00.000Z"),
        items: [{ kcal: 500, proteinG: 30, carbsG: 50, fatG: 10 }],
      },
      // 2026-01-09 sin registro: debe aparecer en cero, no faltar.
      {
        date: new Date("2026-01-10T00:00:00.000Z"),
        items: [{ kcal: 200, proteinG: 10, carbsG: 20, fatG: 5 }],
      },
    ]);

    const { status, body }: { status: number; body: any } = await get(GET, "/api/nutrition/history?days=3");

    expect(status).toBe(200);
    expect(body.from).toBe("2026-01-08");
    expect(body.to).toBe("2026-01-10");
    expect(body.series).toHaveLength(3);
    expect(body.series.map((d: any) => d.date)).toEqual([
      "2026-01-08",
      "2026-01-09",
      "2026-01-10",
    ]);
    expect(body.series[0].kcal).toBe(500);
    expect(body.series[1]).toEqual({ date: "2026-01-09", kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 });
    expect(body.series[2].kcal).toBe(200);
  });

  it("suma varias comidas del mismo día", async () => {
    prismaMock.nutritionMealLog.findMany.mockResolvedValue([
      { date: new Date("2026-01-10T00:00:00.000Z"), items: [{ kcal: 100, proteinG: 5, carbsG: 10, fatG: 2 }] },
      { date: new Date("2026-01-10T00:00:00.000Z"), items: [{ kcal: 200, proteinG: 10, carbsG: 20, fatG: 4 }] },
    ]);

    const { body }: { body: any } = await get(GET, "/api/nutrition/history?days=1");

    expect(body.series).toEqual([{ date: "2026-01-10", kcal: 300, proteinG: 15, carbsG: 30, fatG: 6 }]);
  });

  it("responde 400 con `days` fuera de rango", async () => {
    const { status } = await get(GET, "/api/nutrition/history?days=0");
    expect(status).toBe(400);
  });

  it("responde 401 sin sesión", async () => {
    signOut();
    const { status } = await get(GET, "/api/nutrition/history");
    expect(status).toBe(401);
  });
});
