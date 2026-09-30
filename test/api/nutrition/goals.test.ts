// @vitest-environment node
import { describe, expect, it } from "vitest";
import { GET, PUT } from "@/app/api/nutrition/goals/route";
import { prismaMock } from "../../mocks/prisma";
import { get, put } from "../../helpers/route";
import { signOut } from "../../mocks/session";

describe("GET /api/nutrition/goals", () => {
  it("devuelve la meta por defecto si no hay ninguna guardada", async () => {
    prismaMock.nutritionGoal.findFirst.mockResolvedValue(null);
    const { status, body } = await get(GET, "/api/nutrition/goals");
    expect(status).toBe(200);
    expect(body).toMatchObject({ id: null, kcal: 2000, proteinG: 150, carbsG: 200, fatG: 65 });
  });

  it("devuelve la meta guardada", async () => {
    prismaMock.nutritionGoal.findFirst.mockResolvedValue({
      id: 1,
      kcal: 2500,
      proteinG: 180,
      carbsG: 250,
      fatG: 70,
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    });
    const { body } = await get(GET, "/api/nutrition/goals");
    expect(body.kcal).toBe(2500);
  });

  it("responde 401 sin sesión", async () => {
    signOut();
    const { status } = await get(GET, "/api/nutrition/goals");
    expect(status).toBe(401);
  });
});

describe("PUT /api/nutrition/goals", () => {
  it("crea la meta si no existía ninguna", async () => {
    prismaMock.nutritionGoal.findFirst.mockResolvedValue(null);
    prismaMock.nutritionGoal.create.mockResolvedValue({ id: 1, kcal: 2200, proteinG: 160, carbsG: 220, fatG: 70 });

    const { status } = await put(PUT, "/api/nutrition/goals", {
      kcal: 2200,
      proteinG: 160,
      carbsG: 220,
      fatG: 70,
    });

    expect(status).toBe(200);
    expect(prismaMock.nutritionGoal.update).not.toHaveBeenCalled();
  });

  it("actualiza la meta existente en vez de crear otra fila", async () => {
    prismaMock.nutritionGoal.findFirst.mockResolvedValue({ id: 3 });
    prismaMock.nutritionGoal.update.mockResolvedValue({ id: 3, kcal: 1800, proteinG: 120, carbsG: 150, fatG: 50 });

    const { status } = await put(PUT, "/api/nutrition/goals", {
      kcal: 1800,
      proteinG: 120,
      carbsG: 150,
      fatG: 50,
    });

    expect(status).toBe(200);
    expect(prismaMock.nutritionGoal.create).not.toHaveBeenCalled();
  });

  it("responde 400 con kcal fuera de rango", async () => {
    const { status } = await put(PUT, "/api/nutrition/goals", {
      kcal: 100,
      proteinG: 120,
      carbsG: 150,
      fatG: 50,
    });
    expect(status).toBe(400);
  });

  it("responde 401 sin sesión", async () => {
    signOut();
    const { status } = await put(PUT, "/api/nutrition/goals", {
      kcal: 2000,
      proteinG: 150,
      carbsG: 200,
      fatG: 65,
    });
    expect(status).toBe(401);
  });
});
