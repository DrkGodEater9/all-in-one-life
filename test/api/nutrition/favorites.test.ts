// @vitest-environment node
import { describe, expect, it } from "vitest";
import { GET, POST } from "@/app/api/nutrition/favorites/route";
import { DELETE } from "@/app/api/nutrition/favorites/[id]/route";
import { prismaMock } from "../../mocks/prisma";
import { get, post, del } from "../../helpers/route";
import { signOut } from "../../mocks/session";

describe("GET /api/nutrition/favorites", () => {
  it("lista los favoritos", async () => {
    prismaMock.nutritionFavorite.findMany.mockResolvedValue([{ id: 1, name: "Yogur" }]);
    const { status, body }: { status: number; body: any } = await get(GET, "/api/nutrition/favorites");
    expect(status).toBe(200);
    expect(body).toHaveLength(1);
  });

  it("responde 401 sin sesión", async () => {
    signOut();
    const { status } = await get(GET, "/api/nutrition/favorites");
    expect(status).toBe(401);
  });
});

describe("POST /api/nutrition/favorites", () => {
  it("crea el favorito", async () => {
    prismaMock.nutritionFavorite.create.mockResolvedValue({ id: 1, name: "Yogur" });
    const { status, body }: { status: number; body: any } = await post(POST, "/api/nutrition/favorites", {
      name: "Yogur",
      kcal100g: 59,
      protein100g: 10,
      carbs100g: 3.6,
      fat100g: 0.4,
    });
    expect(status).toBe(201);
    expect(body.name).toBe("Yogur");
  });

  it("responde 400 sin nombre", async () => {
    const { status } = await post(POST, "/api/nutrition/favorites", {
      name: "",
      kcal100g: 1,
      protein100g: 1,
      carbs100g: 1,
      fat100g: 1,
    });
    expect(status).toBe(400);
  });
});

describe("DELETE /api/nutrition/favorites/[id]", () => {
  it("borra el favorito y suelta la referencia en los items ya registrados", async () => {
    prismaMock.nutritionFavorite.findUnique.mockResolvedValue({ id: 1 });
    prismaMock.nutritionMealItem.updateMany.mockResolvedValue({ count: 2 });
    prismaMock.nutritionFavorite.delete.mockResolvedValue({});

    const { status } = await del(DELETE, "/api/nutrition/favorites/1", { id: "1" });

    expect(status).toBe(200);
    expect(prismaMock.nutritionMealItem.updateMany).toHaveBeenCalledWith({
      where: { favoriteId: 1 },
      data: { favoriteId: null },
    });
  });

  it("responde 404 si el favorito no existe", async () => {
    prismaMock.nutritionFavorite.findUnique.mockResolvedValue(null);
    const { status } = await del(DELETE, "/api/nutrition/favorites/999", { id: "999" });
    expect(status).toBe(404);
  });
});
