// @vitest-environment node
import { describe, expect, it } from "vitest";
import { POST as createRecipe } from "@/app/api/nutrition/recipes/route";
import { POST as logRecipe } from "@/app/api/nutrition/recipes/[id]/log/route";
import { prismaMock } from "../../mocks/prisma";
import { post } from "../../helpers/route";
import { signOut } from "../../mocks/session";

describe("POST /api/nutrition/recipes", () => {
  it("escala cada ingrediente por sus gramos y guarda los totales por item", async () => {
    prismaMock.nutritionFavorite.findUnique.mockResolvedValue({
      id: 3,
      name: "Pollo",
      kcal100g: 165,
      protein100g: 31,
      carbs100g: 0,
      fat100g: 3.6,
    });
    prismaMock.nutritionRecipe.create.mockImplementation(async ({ data }: any) => ({
      id: 1,
      name: data.name,
      mealType: data.mealType,
      items: data.items.create.map((i: any, n: number) => ({ id: n + 1, ...i })),
    }));

    const { status, body }: { status: number; body: any } = await post(
      createRecipe,
      "/api/nutrition/recipes",
      {
        name: "Bowl",
        mealType: "lunch",
        items: [
          { favoriteId: 3, amountG: 200 },
          { foodName: "Arroz", kcal100g: 130, protein100g: 2.7, carbs100g: 28, fat100g: 0.3, amountG: 100 },
        ],
      }
    );

    expect(status).toBe(201);
    expect(body.items[0].kcal).toBe(330);
    expect(body.items[0].isEstimated).toBe(false);
    expect(body.items[1].isEstimated).toBe(true);
    expect(body.totals.kcal).toBe(460);
  });

  it("responde 400 sin ingredientes", async () => {
    const { status } = await post(createRecipe, "/api/nutrition/recipes", {
      name: "Vacía",
      items: [],
    });
    expect(status).toBe(400);
    expect(prismaMock.nutritionRecipe.create).not.toHaveBeenCalled();
  });

  it("responde 401 sin sesión", async () => {
    signOut();
    const { status } = await post(createRecipe, "/api/nutrition/recipes", {});
    expect(status).toBe(401);
  });
});

describe("POST /api/nutrition/recipes/[id]/log", () => {
  const RECIPE = {
    id: 1,
    name: "Bowl",
    items: [
      { id: 1, foodName: "Pollo", amountG: 200, state: "cooked", kcal: 330, proteinG: 62, carbsG: 0, fatG: 7.2, isEstimated: false },
      { id: 2, foodName: "Arroz", amountG: 100, state: "unknown", kcal: 130, proteinG: 2.7, carbsG: 28, fatG: 0.3, isEstimated: true },
    ],
  };

  it("copia los ingredientes a la comida del día escalados por porciones", async () => {
    prismaMock.nutritionRecipe.findUnique.mockResolvedValue(RECIPE);
    prismaMock.nutritionMealLog.findFirst.mockResolvedValue(null);
    prismaMock.nutritionMealLog.create.mockResolvedValue({ id: 9 });
    prismaMock.nutritionMealItem.createMany.mockResolvedValue({ count: 2 });

    const { status, body }: { status: number; body: any } = await post(
      logRecipe,
      "/api/nutrition/recipes/1/log",
      { date: "2026-01-01", mealType: "lunch", servings: 0.5 },
      { id: "1" }
    );

    expect(status).toBe(201);
    expect(body.itemsAdded).toBe(2);
    const { data } = prismaMock.nutritionMealItem.createMany.mock.calls[0][0];
    expect(data[0]).toMatchObject({ mealLogId: 9, foodName: "Pollo", amountG: 100, kcal: 165 });
    expect(data[1]).toMatchObject({ kcal: 65, carbsG: 14, isEstimated: true });
  });

  it("reutiliza la comida existente de ese día y tipo", async () => {
    prismaMock.nutritionRecipe.findUnique.mockResolvedValue(RECIPE);
    prismaMock.nutritionMealLog.findFirst.mockResolvedValue({ id: 4 });
    prismaMock.nutritionMealItem.createMany.mockResolvedValue({ count: 2 });

    await post(
      logRecipe,
      "/api/nutrition/recipes/1/log",
      { mealType: "dinner" },
      { id: "1" }
    );

    expect(prismaMock.nutritionMealLog.create).not.toHaveBeenCalled();
    expect(prismaMock.nutritionMealItem.createMany.mock.calls[0][0].data[0].mealLogId).toBe(4);
  });

  it("con macros declarados registra un único renglón escalado por porciones", async () => {
    prismaMock.nutritionRecipe.findUnique.mockResolvedValue({
      ...RECIPE,
      kcal: 700,
      proteinG: 45,
      carbsG: 75,
      fatG: 24,
    });
    prismaMock.nutritionMealLog.findFirst.mockResolvedValue({ id: 4 });
    prismaMock.nutritionMealItem.createMany.mockResolvedValue({ count: 1 });

    const { body }: { body: any } = await post(
      logRecipe,
      "/api/nutrition/recipes/1/log",
      { mealType: "lunch", servings: 2 },
      { id: "1" }
    );

    expect(body.itemsAdded).toBe(1);
    const { data } = prismaMock.nutritionMealItem.createMany.mock.calls[0][0];
    expect(data).toHaveLength(1);
    expect(data[0]).toMatchObject({ foodName: "Bowl", kcal: 1400, proteinG: 90, isEstimated: true });
  });

  it("responde 404 si la receta no existe", async () => {
    prismaMock.nutritionRecipe.findUnique.mockResolvedValue(null);
    const { status } = await post(
      logRecipe,
      "/api/nutrition/recipes/99/log",
      { mealType: "lunch" },
      { id: "99" }
    );
    expect(status).toBe(404);
  });

  it("responde 400 con porciones <= 0", async () => {
    const { status } = await post(
      logRecipe,
      "/api/nutrition/recipes/1/log",
      { mealType: "lunch", servings: 0 },
      { id: "1" }
    );
    expect(status).toBe(400);
  });
});
