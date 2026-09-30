// @vitest-environment node
import { describe, expect, it } from "vitest";
import { GET } from "@/app/api/nutrition/summary/route";
import { prismaMock } from "../../mocks/prisma";
import { get } from "../../helpers/route";
import { signOut } from "../../mocks/session";

describe("GET /api/nutrition/summary", () => {
  it("suma los items del día y calcula lo restante contra la meta", async () => {
    prismaMock.nutritionMealItem.findMany.mockResolvedValue([
      { kcal: 500, proteinG: 30, carbsG: 50, fatG: 10 },
      { kcal: 300, proteinG: 20, carbsG: 25, fatG: 5 },
    ]);
    prismaMock.nutritionGoal.findFirst.mockResolvedValue({
      id: 1,
      kcal: 2000,
      proteinG: 150,
      carbsG: 200,
      fatG: 65,
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    });

    const { status, body }: { status: number; body: any } = await get(GET, "/api/nutrition/summary?date=2026-01-15");

    expect(status).toBe(200);
    expect(body.date).toBe("2026-01-15");
    expect(body.itemCount).toBe(2);
    expect(body.totals).toEqual({ kcal: 800, proteinG: 50, carbsG: 75, fatG: 15 });
    expect(body.remaining).toEqual({ kcal: 1200, proteinG: 100, carbsG: 125, fatG: 50 });
  });

  it("un día sin registros devuelve ceros, no falla", async () => {
    prismaMock.nutritionMealItem.findMany.mockResolvedValue([]);

    const { status, body }: { status: number; body: any } = await get(GET, "/api/nutrition/summary?date=2026-02-01");

    expect(status).toBe(200);
    expect(body.itemCount).toBe(0);
    expect(body.totals).toEqual({ kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 });
    // Sin meta guardada, usa la meta por defecto.
    expect(body.goal.kcal).toBe(2000);
    expect(body.remaining.kcal).toBe(2000);
  });

  it("responde 400 con una fecha mal formada", async () => {
    const { status } = await get(GET, "/api/nutrition/summary?date=15-01-2026");
    expect(status).toBe(400);
  });

  it("responde 401 sin sesión", async () => {
    signOut();
    const { status } = await get(GET, "/api/nutrition/summary");
    expect(status).toBe(401);
  });
});
