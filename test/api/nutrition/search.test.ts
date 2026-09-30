// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/nutrition/search/route";
import { prismaMock } from "../../mocks/prisma";
import { get } from "../../helpers/route";
import { signOut } from "../../mocks/session";

function offPayload(products: unknown[]) {
  return { products };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("GET /api/nutrition/search", () => {
  it("responde 400 si `q` tiene menos de 2 caracteres", async () => {
    const { status } = await get(GET, "/api/nutrition/search?q=a");
    expect(status).toBe(400);
  });

  it("responde 400 sin `q`", async () => {
    const { status } = await get(GET, "/api/nutrition/search");
    expect(status).toBe(400);
  });

  it("se degrada con gracia: responde 200 con lo cacheado si OpenFoodFacts no responde ok", async () => {
    prismaMock.nutritionFavorite.findMany.mockResolvedValue([]);
    prismaMock.nutritionFoodCache.findMany.mockResolvedValue([
      { id: 1, offId: "off-1", name: "Pollo cache", kcal100g: 165, protein100g: 31, carbs100g: 0, fat100g: 3.6 },
    ]);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) }))
    );

    const { status, body }: { status: number; body: any } = await get(GET, "/api/nutrition/search?q=pollo");

    expect(status).toBe(200);
    expect(body).toHaveLength(1);
    expect(body[0].source).toBe("cache");
  });

  it("se degrada con gracia si fetch lanza (timeout / error de red)", async () => {
    prismaMock.nutritionFavorite.findMany.mockResolvedValue([]);
    prismaMock.nutritionFoodCache.findMany.mockResolvedValue([]);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("timeout");
      })
    );

    const { status, body }: { status: number; body: any } = await get(GET, "/api/nutrition/search?q=pollo");

    expect(status).toBe(200);
    expect(body).toEqual([]);
  });

  it("se degrada con gracia si la respuesta no es JSON válido", async () => {
    prismaMock.nutritionFavorite.findMany.mockResolvedValue([]);
    prismaMock.nutritionFoodCache.findMany.mockResolvedValue([]);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => {
          throw new SyntaxError("Unexpected token");
        },
      }))
    );

    const { status, body }: { status: number; body: any } = await get(GET, "/api/nutrition/search?q=pollo");

    expect(status).toBe(200);
    expect(body).toEqual([]);
  });

  it("descarta productos de OpenFoodFacts sin nombre o con kcal <= 0, y cachea los válidos", async () => {
    prismaMock.nutritionFavorite.findMany.mockResolvedValue([]);
    prismaMock.nutritionFoodCache.findMany.mockResolvedValue([]);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () =>
          offPayload([
            { code: "1", product_name: "", nutriments: { "energy-kcal_100g": 100 } }, // sin nombre
            { code: "2", product_name: "Sin calorías", nutriments: { "energy-kcal_100g": 0 } }, // kcal 0
            { code: "3", product_name: "Con calorías negativas", nutriments: { "energy-kcal_100g": -5 } },
            {
              code: "4",
              product_name: "Manzana",
              nutriments: {
                "energy-kcal_100g": 52,
                proteins_100g: 0.3,
                carbohydrates_100g: 14,
                fat_100g: 0.2,
              },
            },
          ]),
      }))
    );
    prismaMock.nutritionFoodCache.upsert.mockResolvedValue({
      id: 10,
      offId: "4",
      name: "Manzana",
      kcal100g: 52,
      protein100g: 0.3,
      carbs100g: 14,
      fat100g: 0.2,
    });

    const { status, body }: { status: number; body: any } = await get(GET, "/api/nutrition/search?q=manzana");

    expect(status).toBe(200);
    expect(body).toHaveLength(1);
    expect(body[0].name).toBe("Manzana");
    expect(body[0].source).toBe("off");
    expect(prismaMock.nutritionFoodCache.upsert).toHaveBeenCalledTimes(1);
  });

  it("no repite un producto de OFF ya presente en caché (mismo offId)", async () => {
    prismaMock.nutritionFavorite.findMany.mockResolvedValue([]);
    prismaMock.nutritionFoodCache.findMany.mockResolvedValue([
      { id: 1, offId: "4", name: "Manzana", kcal100g: 52, protein100g: 0.3, carbs100g: 14, fat100g: 0.2 },
    ]);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () =>
          offPayload([
            { code: "4", product_name: "Manzana", nutriments: { "energy-kcal_100g": 52 } },
          ]),
      }))
    );

    const { status, body }: { status: number; body: any } = await get(GET, "/api/nutrition/search?q=manzana");

    expect(status).toBe(200);
    expect(body).toHaveLength(1);
    expect(body[0].source).toBe("cache");
    expect(prismaMock.nutritionFoodCache.upsert).not.toHaveBeenCalled();
  });

  it("responde 401 sin sesión", async () => {
    signOut();
    const { status } = await get(GET, "/api/nutrition/search?q=pollo");
    expect(status).toBe(401);
  });
});
