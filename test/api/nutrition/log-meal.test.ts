// @vitest-environment node
import { describe, expect, it } from "vitest";
import { POST as CREATE_MEAL } from "@/app/api/nutrition/log/meal/route";
import { GET as GET_LOG } from "@/app/api/nutrition/log/route";
import { prismaMock } from "../../mocks/prisma";
import { get, post } from "../../helpers/route";
import { signOut } from "../../mocks/session";

describe("POST /api/nutrition/log/meal", () => {
  it("crea la comida si no existe una de ese tipo ese día", async () => {
    prismaMock.nutritionMealLog.findFirst.mockResolvedValue(null);
    prismaMock.nutritionMealLog.create.mockResolvedValue({ id: 1, mealType: "lunch" });

    const { status, body } = await post(CREATE_MEAL, "/api/nutrition/log/meal", {
      date: "2026-01-01",
      mealType: "lunch",
    });

    expect(status).toBe(201);
    expect(body.id).toBe(1);
  });

  it("reutiliza la comida existente en vez de duplicarla", async () => {
    prismaMock.nutritionMealLog.findFirst.mockResolvedValue({ id: 7, mealType: "breakfast" });

    const { status, body } = await post(CREATE_MEAL, "/api/nutrition/log/meal", {
      date: "2026-01-01",
      mealType: "breakfast",
    });

    expect(status).toBe(200);
    expect(body.id).toBe(7);
    expect(prismaMock.nutritionMealLog.create).not.toHaveBeenCalled();
  });

  it("responde 400 con un mealType fuera del enum", async () => {
    const { status } = await post(CREATE_MEAL, "/api/nutrition/log/meal", {
      mealType: "brunch",
    });
    expect(status).toBe(400);
  });

  it("responde 401 sin sesión", async () => {
    signOut();
    const { status } = await post(CREATE_MEAL, "/api/nutrition/log/meal", { mealType: "lunch" });
    expect(status).toBe(401);
  });
});

describe("GET /api/nutrition/log", () => {
  it("ordena las comidas desayuno -> almuerzo -> cena -> snacks y suma los totales", async () => {
    prismaMock.nutritionMealLog.findMany.mockResolvedValue([
      {
        id: 2,
        mealType: "dinner",
        items: [{ id: 1, kcal: 300, proteinG: 20, carbsG: 30, fatG: 5, amountG: 100, state: "raw", isEstimated: false, mealLogId: 2, foodName: "x", foodCacheId: null, favoriteId: null }],
      },
      {
        id: 1,
        mealType: "breakfast",
        items: [{ id: 2, kcal: 200, proteinG: 10, carbsG: 20, fatG: 5, amountG: 50, state: "raw", isEstimated: false, mealLogId: 1, foodName: "y", foodCacheId: null, favoriteId: null }],
      },
    ]);

    const { status, body } = await get(GET_LOG, "/api/nutrition/log?date=2026-01-01");

    expect(status).toBe(200);
    expect(body.meals.map((m: any) => m.mealType)).toEqual(["breakfast", "dinner"]);
    expect(body.meals[0].totals).toEqual({ kcal: 200, proteinG: 10, carbsG: 20, fatG: 5 });
  });

  it("un día sin comidas devuelve una lista vacía", async () => {
    prismaMock.nutritionMealLog.findMany.mockResolvedValue([]);
    const { status, body } = await get(GET_LOG, "/api/nutrition/log?date=2026-01-01");
    expect(status).toBe(200);
    expect(body.meals).toEqual([]);
  });

  it("responde 401 sin sesión", async () => {
    signOut();
    const { status } = await get(GET_LOG, "/api/nutrition/log");
    expect(status).toBe(401);
  });
});
