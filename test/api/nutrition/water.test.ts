// @vitest-environment node
import { describe, expect, it } from "vitest";
import { GET, POST } from "@/app/api/nutrition/water/route";
import { prismaMock } from "../../mocks/prisma";
import { get, post } from "../../helpers/route";
import { signOut } from "../../mocks/session";

describe("GET /api/nutrition/water", () => {
  it("devuelve el total del día sumando los registros", async () => {
    prismaMock.nutritionWaterLog.findMany.mockResolvedValue([
      { id: 1, amountMl: 250, createdAt: new Date("2026-01-01T08:00:00.000Z") },
      { id: 2, amountMl: 500, createdAt: new Date("2026-01-01T12:00:00.000Z") },
    ]);
    prismaMock.nutritionWaterLog.aggregate.mockResolvedValue({ _sum: { amountMl: 750 } });

    const { status, body } = await get(GET, "/api/nutrition/water?date=2026-01-01");

    expect(status).toBe(200);
    expect(body.totalMl).toBe(750);
    expect(body.logs).toHaveLength(2);
  });

  it("un día sin registros da total 0, no falla", async () => {
    prismaMock.nutritionWaterLog.findMany.mockResolvedValue([]);
    prismaMock.nutritionWaterLog.aggregate.mockResolvedValue({ _sum: { amountMl: null } });

    const { status, body } = await get(GET, "/api/nutrition/water?date=2026-01-02");

    expect(status).toBe(200);
    expect(body.totalMl).toBe(0);
  });

  it("responde 401 sin sesión", async () => {
    signOut();
    const { status } = await get(GET, "/api/nutrition/water");
    expect(status).toBe(401);
  });
});

describe("POST /api/nutrition/water", () => {
  it("usa 250 ml por defecto si no se indica amountMl", async () => {
    prismaMock.nutritionWaterLog.create.mockResolvedValue({});
    prismaMock.nutritionWaterLog.aggregate.mockResolvedValue({ _sum: { amountMl: 250 } });

    const { status, body } = await post(POST, "/api/nutrition/water", {});

    expect(status).toBe(201);
    expect(prismaMock.nutritionWaterLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ amountMl: 250 }) })
    );
    expect(body.totalMl).toBe(250);
  });

  it("acepta un cuerpo vacío (sin JSON) y aplica igual el default", async () => {
    prismaMock.nutritionWaterLog.create.mockResolvedValue({});
    prismaMock.nutritionWaterLog.aggregate.mockResolvedValue({ _sum: { amountMl: 250 } });

    const { status } = await post(POST, "/api/nutrition/water", undefined);

    expect(status).toBe(201);
  });

  it("registra la cantidad indicada", async () => {
    prismaMock.nutritionWaterLog.create.mockResolvedValue({});
    prismaMock.nutritionWaterLog.aggregate.mockResolvedValue({ _sum: { amountMl: 500 } });

    const { status, body } = await post(POST, "/api/nutrition/water", { amountMl: 500 });

    expect(status).toBe(201);
    expect(body.totalMl).toBe(500);
  });

  it("responde 400 con amountMl fuera de rango", async () => {
    const { status } = await post(POST, "/api/nutrition/water", { amountMl: 0 });
    expect(status).toBe(400);
  });

  it("responde 401 sin sesión", async () => {
    signOut();
    const { status } = await post(POST, "/api/nutrition/water", {});
    expect(status).toBe(401);
  });
});
