// @vitest-environment node
import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/nutrition/log/meal/[id]/item/route";
import { prismaMock } from "../../mocks/prisma";
import { post } from "../../helpers/route";
import { signOut } from "../../mocks/session";

const MEAL = { id: 1, date: new Date("2026-01-01T00:00:00.000Z"), mealType: "lunch" };

describe("POST /api/nutrition/log/meal/[id]/item", () => {
  it("calcula kcal/proteína/carbos/grasa como valor_por_100g * gramos / 100, con decimales", async () => {
    prismaMock.nutritionMealLog.findUnique.mockResolvedValue(MEAL);
    prismaMock.nutritionMealItem.create.mockImplementation(async ({ data }: any) => data);

    const { status, body } = await post(
      POST,
      "/api/nutrition/log/meal/1/item",
      {
        foodName: "Pollo",
        kcal100g: 165,
        protein100g: 31,
        carbs100g: 0,
        fat100g: 3.6,
        amountG: 137.5,
      },
      { id: "1" }
    );

    expect(status).toBe(201);
    expect(body.kcal).toBe(226.88);
    expect(body.proteinG).toBe(42.63);
    expect(body.carbsG).toBe(0);
    expect(body.fatG).toBe(4.95);
  });

  it("redondea a 2 decimales con una cantidad entera simple", async () => {
    prismaMock.nutritionMealLog.findUnique.mockResolvedValue(MEAL);
    prismaMock.nutritionMealItem.create.mockImplementation(async ({ data }: any) => data);

    const { body } = await post(
      POST,
      "/api/nutrition/log/meal/1/item",
      { foodName: "Arroz", kcal100g: 130, protein100g: 2.7, carbs100g: 28, fat100g: 0.3, amountG: 50 },
      { id: "1" }
    );

    expect(body.kcal).toBe(65);
    expect(body.proteinG).toBe(1.35);
    expect(body.carbsG).toBe(14);
    expect(body.fatG).toBe(0.15);
  });

  it("marca isEstimated cuando el alimento no viene de favoritos ni de caché (entrada manual)", async () => {
    prismaMock.nutritionMealLog.findUnique.mockResolvedValue(MEAL);
    prismaMock.nutritionMealItem.create.mockImplementation(async ({ data }: any) => data);

    const { body } = await post(
      POST,
      "/api/nutrition/log/meal/1/item",
      { foodName: "Casero", kcal100g: 100, protein100g: 5, carbs100g: 10, fat100g: 2, amountG: 100 },
      { id: "1" }
    );

    expect(body.isEstimated).toBe(true);
  });

  it("marca isEstimated cuando el foodCache respaldado tiene macros incompletos", async () => {
    prismaMock.nutritionMealLog.findUnique.mockResolvedValue(MEAL);
    prismaMock.nutritionFoodCache.findUnique.mockResolvedValue({
      id: 7,
      name: "Producto OFF",
      kcal100g: 200,
      protein100g: null,
      carbs100g: null,
      fat100g: null,
    });
    prismaMock.nutritionMealItem.create.mockImplementation(async ({ data }: any) => data);

    const { body } = await post(
      POST,
      "/api/nutrition/log/meal/1/item",
      { foodCacheId: 7, amountG: 100 },
      { id: "1" }
    );

    expect(body.isEstimated).toBe(true);
    expect(body.kcal).toBe(200);
    expect(body.proteinG).toBe(0);
  });

  it("no marca isEstimated cuando el foodCache respaldado tiene todos los macros", async () => {
    prismaMock.nutritionMealLog.findUnique.mockResolvedValue(MEAL);
    prismaMock.nutritionFoodCache.findUnique.mockResolvedValue({
      id: 8,
      name: "Producto completo",
      kcal100g: 200,
      protein100g: 10,
      carbs100g: 20,
      fat100g: 5,
    });
    prismaMock.nutritionMealItem.create.mockImplementation(async ({ data }: any) => data);

    const { body } = await post(
      POST,
      "/api/nutrition/log/meal/1/item",
      { foodCacheId: 8, amountG: 200 },
      { id: "1" }
    );

    expect(body.isEstimated).toBe(false);
    expect(body.kcal).toBe(400);
    expect(body.foodName).toBe("Producto completo");
  });

  it("registra desde un favorito (favoriteId) usando su nombre y macros", async () => {
    prismaMock.nutritionMealLog.findUnique.mockResolvedValue(MEAL);
    prismaMock.nutritionFavorite.findUnique.mockResolvedValue({
      id: 3,
      name: "Yogur griego",
      kcal100g: 59,
      protein100g: 10,
      carbs100g: 3.6,
      fat100g: 0.4,
    });
    prismaMock.nutritionMealItem.create.mockImplementation(async ({ data }: any) => data);

    const { status, body } = await post(
      POST,
      "/api/nutrition/log/meal/1/item",
      { favoriteId: 3, amountG: 150 },
      { id: "1" }
    );

    expect(status).toBe(201);
    expect(body.foodName).toBe("Yogur griego");
    expect(body.kcal).toBe(88.5);
    expect(body.isEstimated).toBe(false);
  });

  it("responde 400 si el cuerpo no encaja en ninguna de las tres formas", async () => {
    prismaMock.nutritionMealLog.findUnique.mockResolvedValue(MEAL);

    const { status } = await post(
      POST,
      "/api/nutrition/log/meal/1/item",
      { amountG: 100 },
      { id: "1" }
    );

    expect(status).toBe(400);
    expect(prismaMock.nutritionMealItem.create).not.toHaveBeenCalled();
  });

  it("responde 400 si foodName no viene con kcal100g", async () => {
    prismaMock.nutritionMealLog.findUnique.mockResolvedValue(MEAL);

    const { status } = await post(
      POST,
      "/api/nutrition/log/meal/1/item",
      { foodName: "Algo", amountG: 100 },
      { id: "1" }
    );

    expect(status).toBe(400);
  });

  it("responde 404 si la comida no existe", async () => {
    prismaMock.nutritionMealLog.findUnique.mockResolvedValue(null);

    const { status } = await post(
      POST,
      "/api/nutrition/log/meal/999/item",
      { foodName: "X", kcal100g: 100, amountG: 100 },
      { id: "999" }
    );

    expect(status).toBe(404);
  });

  it("responde 404 si el favoriteId no existe", async () => {
    prismaMock.nutritionMealLog.findUnique.mockResolvedValue(MEAL);
    prismaMock.nutritionFavorite.findUnique.mockResolvedValue(null);

    const { status } = await post(
      POST,
      "/api/nutrition/log/meal/1/item",
      { favoriteId: 999, amountG: 100 },
      { id: "1" }
    );

    expect(status).toBe(404);
  });

  it("responde 404 si el foodCacheId no existe", async () => {
    prismaMock.nutritionMealLog.findUnique.mockResolvedValue(MEAL);
    prismaMock.nutritionFoodCache.findUnique.mockResolvedValue(null);

    const { status } = await post(
      POST,
      "/api/nutrition/log/meal/1/item",
      { foodCacheId: 999, amountG: 100 },
      { id: "1" }
    );

    expect(status).toBe(404);
  });

  it("responde 400 con un id de comida no numérico", async () => {
    const { status } = await post(
      POST,
      "/api/nutrition/log/meal/abc/item",
      { foodName: "X", kcal100g: 100, amountG: 100 },
      { id: "abc" }
    );
    expect(status).toBe(400);
  });

  it("responde 400 con gramos <= 0", async () => {
    prismaMock.nutritionMealLog.findUnique.mockResolvedValue(MEAL);
    const { status } = await post(
      POST,
      "/api/nutrition/log/meal/1/item",
      { foodName: "X", kcal100g: 100, amountG: 0 },
      { id: "1" }
    );
    expect(status).toBe(400);
  });

  it("responde 401 sin sesión", async () => {
    signOut();
    const { status } = await post(
      POST,
      "/api/nutrition/log/meal/1/item",
      { foodName: "X", kcal100g: 100, amountG: 100 },
      { id: "1" }
    );
    expect(status).toBe(401);
  });
});
